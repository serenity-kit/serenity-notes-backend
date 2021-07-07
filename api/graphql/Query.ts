import {
  stringArg,
  idArg,
  inputObjectType,
  arg,
  queryType,
  objectType,
} from "nexus";
import { prisma } from "../../prisma/client";
import { getDeviceAndUserByAuthMessage } from "../utils";
import { getRepositoryContent } from "../helpers/repository";
import getBillingAccountByAuthToken from "../utils/getBillingAccountByAuthToken";
import { notEmpty } from "../utils/notEmpty";
import haveEqualStringEntries from "../utils/haveEqualStringEntries";

function uniqById(array: { id: string }[]) {
  let seen = new Set();
  return array.filter((item) => {
    return seen.has(item.id) ? false : seen.add(item.id);
  });
}

export const LastContentUpdateIntegrityIdByRepository = inputObjectType({
  name: "LastContentUpdateIntegrityIdByRepository",
  definition(t) {
    t.id("repositoryId", { required: true });
    t.string("lastContentUpdateIntegrityId", { required: true });
  },
});

export const RepositoryDevicesResult = objectType({
  name: "RepositoryDevicesResult",
  definition(t) {
    t.list.field("devices", { type: "Device" });
    t.boolean("groupSessionMessageIdsMatchTargetDevices");
  },
});

export const Query = queryType({
  definition(t) {
    t.field("repositoryDevices", {
      type: "RepositoryDevicesResult",
      nullable: true,
      args: {
        repositoryId: idArg({ required: true }),
        groupSessionMessageIds: idArg({
          list: true,
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        // TODO implement tombstone handling (fetch tombstones by repositoryId and current user as collaborator)
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const currentUser = sessionInfo.user;

        const repo = await prisma.repository.findUnique({
          where: { id: args.repositoryId },
          include: { collaborators: { include: { devices: true } } },
        });
        if (!repo) return null;
        // TODO move access check directly into where part of the query
        const hasAccess = repo.collaborators.some(
          (collaborator) => collaborator.id === currentUser.id
        );
        if (!hasAccess) return null;

        const groupSessionMessages = await prisma.groupSessionMessage.findMany({
          where: { id: { in: args.groupSessionMessageIds } },
          select: { targetDeviceIdKey: true },
        });
        const foundAllGroupSessionMessages =
          args.groupSessionMessageIds.length === groupSessionMessages.length;
        const groupSessionMessagesTargetDeviceIds = groupSessionMessages.map(
          (groupSessionMessage) => groupSessionMessage.targetDeviceIdKey
        );

        const devices = repo.collaborators
          .map((collaborator) => collaborator.devices)
          .flat();
        const deviceIdKeys = devices.map((device) => device.idKey);

        return {
          devices,
          groupSessionMessageIdsMatchTargetDevices:
            foundAllGroupSessionMessages &&
            haveEqualStringEntries(
              deviceIdKeys,
              groupSessionMessagesTargetDeviceIds
            ),
        };
      },
    });
    // used for repositoryDevicesQuery on the 1.0 client version
    t.field("repository", {
      type: "RepositoryResult",
      deprecation: "Use `repositoryDevices` instead",
      nullable: true,
      args: {
        // TODO change to repositoryId
        id: idArg({ required: true }),
      },
      async resolve(root, args, ctx) {
        // TODO implement tombstone handling (fetch tombstones by repositoryId and current user as collaborator)
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const currentUser = sessionInfo.user;
        const currentDevice = sessionInfo.device;

        const repo = await prisma.repository.findUnique({
          where: { id: args.id },
          include: {
            collaborators: true,
          },
        });
        if (!repo) return null;
        // TODO move access check directly into where part of the query
        const hasAccess = repo.collaborators.some(
          (collaborator) => collaborator.id === currentUser.id
        );
        if (!hasAccess) return null;

        const content = await getRepositoryContent({
          repositoryId: repo.id,
          collaborators: repo.collaborators,
          deviceIdKey: currentDevice.idKey,
        });

        return { ...repo, content };
      },
    });

    // TODO should become a connection
    t.list.field("allRepositories", {
      type: "RepositoryResult",
      nullable: true,
      args: {
        lastContentUpdateIntegrityIdsByRepository: arg({
          list: true,
          type: "LastContentUpdateIntegrityIdByRepository",
          required: false,
        }),
      },
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const currentUser = sessionInfo.user;
        const currentDevice = sessionInfo.device;

        const repositoriesRequest = prisma.repository.findMany({
          where: {
            collaborators: { some: { id: { equals: currentUser.id } } },
          },
          include: { collaborators: true },
        });

        const repositoryEventsRequest = prisma.repositoryEvents.findMany({
          where: {
            affectedCollaborators: { some: { id: { equals: currentUser.id } } },
          },
        });

        const [repositories, repositoryEvents] = await Promise.all([
          repositoriesRequest,
          repositoryEventsRequest,
        ]);

        const repositoriesWithContent = await repositories.map((repo) => {
          const entry = args.lastContentUpdateIntegrityIdsByRepository?.find(
            // @ts-ignore
            (item) => item.repositoryId === repo.id
          );
          // In case the Ids match the client already received all the content updates
          // and we don't need to send them again. The goal is the avoid sending unnecessary
          // data.
          if (
            entry?.lastContentUpdateIntegrityId &&
            entry.lastContentUpdateIntegrityId ===
              repo.lastContentUpdateIntegrityId
          ) {
            return { ...repo, content: [] };
          } else {
            return {
              ...repo,
              content: getRepositoryContent({
                repositoryId: repo.id,
                collaborators: repo.collaborators,
                deviceIdKey: currentDevice.idKey,
              }),
            };
          }
        });

        const activeRepoIds = repositories.map((repository) => repository.id);
        const repositoryTombstones = repositoryEvents
          .filter(
            (event) =>
              event.type === "DELETE" || event.type === "REMOVE_COLLABORATORS"
          )
          .map((event) => ({ id: event.repositoryId }))
          .filter((repoTombstone) => !activeRepoIds.includes(repoTombstone.id));

        return [...repositoriesWithContent, ...uniqById(repositoryTombstones)];
      },
    });

    t.list.field("devices", {
      type: "Device",
      nullable: true,
      async resolve(root, args, ctx) {
        const currentUser =
          // @ts-ignore
          (await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage)).user;
        const devices = await prisma.device.findMany({
          where: {
            userId: currentUser.id,
          },
        });
        return devices;
      },
    });

    t.list.field("contacts", {
      type: "Contact",
      nullable: true,
      async resolve(root, args, ctx) {
        const currentUser =
          // @ts-ignore
          (await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage)).user;

        const contacts = await prisma.contact.findMany({
          where: {
            userId: currentUser.id,
          },
        });
        return contacts;
      },
    });

    t.list.field("devicesForContact", {
      type: "Device",
      nullable: true,
      args: {
        contactId: idArg({ required: true }),
      },
      async resolve(root, args, ctx) {
        // const currentUser =
        //   // @ts-ignore
        //   (await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage)).user;
        const contact = await prisma.contact.findUnique({
          where: {
            id: args.contactId,
          },
          include: {
            contactUser: {
              include: {
                devices: true,
              },
            },
          },
        });
        // TODO for security check contact.userId matches currentUser.id to avoid other people fetching the user's contacts

        // @ts-ignore TODO
        return contact.contactUser.devices;
      },
    });

    t.list.field("devicesForContactInvitation", {
      type: "Device",
      nullable: true,
      args: {
        userSigningKey: stringArg({ required: true }),
        userId: idArg({ required: true }),
        serverSecret: stringArg({ required: true }),
      },
      async resolve(root, args, ctx) {
        // const currentUser =
        //   // @ts-ignore
        //   (await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage)).user;
        const contactInvitations = await prisma.contactInvitation.findMany({
          where: {
            signingKey: args.userSigningKey,
            userId: args.userId,
            serverSecret: args.serverSecret,
            status: { not: "COMPLETED" },
          },
          include: {
            user: {
              include: {
                devices: true,
              },
            },
          },
        });
        // TODO for security check contact.userId matches currentUser.id to avoid other people fetching the user's contacts

        // @ts-ignore TODO
        return contactInvitations[0].user.devices;
      },
    });

    t.field("privateInfo", {
      type: "PrivateInfo",
      nullable: true,
      async resolve(root, args, ctx) {
        const { device: currentDevice, user: currentUser } =
          // @ts-ignore
          await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage);

        const devices = await prisma.device.findMany({
          where: {
            userId: currentUser.id,
          },
        });

        const privateInfoContentRequests = devices.map(async (device) => {
          const contentArray = await prisma.privateInfoContent.findMany({
            where: {
              device: { id: device.id },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              // only retrieve the privateInfoGroupSessionMessage only for the targetDevice
              privateInfoGroupSessionMessages: {
                where: {
                  targetDeviceIdKey: currentDevice.idKey,
                },
              },
            },
          });
          if (contentArray.length > 0) {
            return {
              content: contentArray[0],
              authorDevice: device,
            };
          }
          return null;
        });
        const privateInfoContentResults = await Promise.all(
          privateInfoContentRequests
        );

        return {
          privateInfoContent: privateInfoContentResults
            .filter(notEmpty)
            // filter out the privateInfoContentResults entries that don't have a privateInfoGroupSessionMessage since the device won't be able to decrypt it and fail
            .filter((entry) => {
              return entry.content.privateInfoGroupSessionMessages.length > 0;
            })
            .map((entry) => {
              return {
                ...entry.content,
                authorDevice: entry.authorDevice,
                privateInfoGroupSessionMessage:
                  entry.content.privateInfoGroupSessionMessages[0],
              };
            }),
        };
      },
    });

    t.field("fetchAddDeviceVerification", {
      type: "AddDeviceVerification",
      nullable: true,
      args: {
        deviceIdKey: stringArg({ required: true }),
        serverSecret: stringArg({ required: true }),
      },
      async resolve(root, args, ctx) {
        const addDeviceVerification =
          await prisma.addDeviceVerification.findMany({
            where: {
              deviceIdKey: args.deviceIdKey,
              serverSecret: args.serverSecret,
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          });
        if (addDeviceVerification.length !== 0) {
          return addDeviceVerification[0];
        }
        throw new Error("Authorization failed.");
      },
    });

    // TODO should become a connection
    t.list.field("contactInvitations", {
      type: "ContactInvitation",
      nullable: true,
      async resolve(root, args, ctx) {
        const currentUser =
          // @ts-ignore
          (await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage)).user;

        const contactInvitations = await prisma.contactInvitation.findMany({
          where: { userId: currentUser.id, NOT: { status: "COMPLETED" } },
        });
        return contactInvitations;
      },
    });

    t.int("unclaimedOneTimeKeysCount", {
      nullable: true,
      args: {
        deviceIdKey: stringArg({ required: false }),
      },
      async resolve(root, args, ctx) {
        const sessionInfo =
          // @ts-ignore
          await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage);

        let device = sessionInfo.device;
        const currentUser = sessionInfo.user;

        if (args.deviceIdKey) {
          const requestedDevice = await prisma.device.findUnique({
            where: { idKey: args.deviceIdKey },
            include: { user: true },
          });
          if (
            requestedDevice &&
            currentUser &&
            requestedDevice.userId === currentUser.id
          ) {
            device = requestedDevice;
          } else {
            throw new Error("Authorization failed.");
          }
        }

        const amount = await prisma.oneTimeKey.count({
          where: {
            AND: [
              { device: { idKey: device.idKey } },
              { claimedByDeviceId: { equals: null } },
            ],
          },
        });

        return amount;
      },
    });

    t.list.field("allLicenseTokens", {
      type: "LicenseToken",
      async resolve(root, args, ctx) {
        const currentUser =
          // @ts-ignore
          (await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage)).user;

        const licenses = await prisma.license.findMany({
          where: { userId: currentUser.id },
          include: {
            billingAccount: {
              select: {
                subscriptionPlan: true,
                paddleSubscriptionStatus: true,
              },
            },
          },
        });
        return licenses.map((license) => {
          return {
            token: license.token,
            isActive: ["ACTIVE", "TRAILING"].includes(
              license.billingAccount.paddleSubscriptionStatus
            ),
            subscriptionPlan: license.billingAccount.subscriptionPlan,
          };
        });
      },
    });

    t.list.field("allDeviceTombstones", {
      type: "DeviceTombstone",
      async resolve(root, args, ctx) {
        const currentUser =
          // @ts-ignore
          (await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage)).user;

        const deviceTombstones = await prisma.deviceTombstone.findMany({
          where: { userId: currentUser.id },
        });
        return deviceTombstones;
      },
    });

    t.field("billingAccount", {
      type: "BillingAccount",
      nullable: true,
      async resolve(root, args, ctx) {
        const { billingAccount } = await getBillingAccountByAuthToken(
          ctx.billingAccountAuthToken
        );
        const licenses = await prisma.license.findMany({
          where: { billingAccountId: billingAccount.id },
        });
        return {
          ...billingAccount,
          allLicenses: licenses,
        };
      },
    });

    t.string("latestMacClientVersion", {
      nullable: true,
      resolve() {
        return "0.2.0";
      },
    });
  },
});
