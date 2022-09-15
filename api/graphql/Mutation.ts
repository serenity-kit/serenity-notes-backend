import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { objectType, inputObjectType, mutationType, arg } from "nexus";
import { prisma } from "../../prisma/client";
import { OneTimeKey } from "@prisma/client";
import { getDeviceAndUserByAuthMessage } from "../utils";
import getBillingAccountByAuthToken from "../utils/getBillingAccountByAuthToken";
import sendBillingAccountAuthEmail from "../utils/sendBillingAccountAuthEmail";
import { notEmpty } from "../utils/notEmpty";
import { CustomContext } from "../types";
import { getDeleteDevicePromises } from "../helpers/device";
import { assertIsCollaborator } from "../helpers/repository";

const isProd =
  process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test";

export const OneTimeKeyInput = inputObjectType({
  name: "OneTimeKeyInput",
  definition(t) {
    t.string("key", { required: true });
    t.string("signature", { required: true });
  },
});

export const DeviceInput = inputObjectType({
  name: "DeviceInput",
  definition(t) {
    t.string("idKey", { required: true });
    t.list.field("oneTimeKeys", { type: "OneTimeKeyInput", required: true });
    t.string("signingKey", { required: true });
    t.string("signature", { required: true });
    t.string("fallbackKey", { required: true });
    t.string("fallbackKeySignature", { required: true });
  },
});

export const CreateUserInput = inputObjectType({
  name: "CreateUserInput",
  definition(t) {
    t.field("device", {
      type: "DeviceInput",
      required: true,
    });
    t.string("signingKey", { required: true });
  },
});

export const CreateUserResult = objectType({
  name: "CreateUserResult",
  definition(t) {
    t.field("user", {
      type: "User",
      nullable: true,
    });
  },
});

export const GroupSessionMessageInput = inputObjectType({
  name: "GroupSessionMessageInput",
  definition(t) {
    t.int("type", { required: true });
    t.string("body", { required: true });
    t.string("targetDeviceIdKey", { required: true });
  },
});

export const ContentInput = inputObjectType({
  name: "ContentInput",
  definition(t) {
    t.string("encryptedContent", { required: true });
    t.list.field("groupSessionMessages", {
      type: "GroupSessionMessageInput",
      required: false,
    });
    // TODO eventually this should be mandatory
    t.int("schemaVersion", { required: false });
    // TODO eventually this should be mandatory
    t.string("schemaVersionSignature", { required: false });
  },
});

export const CreateRepositoryInput = inputObjectType({
  name: "CreateRepositoryInput",
  definition(t) {
    t.field("content", {
      type: "ContentInput",
      required: true,
    });
  },
});

export const CreateRepositoryResult = objectType({
  name: "CreateRepositoryResult",
  definition(t) {
    t.field("repository", {
      type: "Repository",
      nullable: true,
    });
    t.list.id("groupSessionMessageIds", { nullable: true });
  },
});

export const UpdateRepositoryContentInput = inputObjectType({
  name: "UpdateRepositoryContentInput",
  definition(t) {
    t.id("repositoryId", { required: true });
    t.string("encryptedContent", { required: true });
    t.list.id("groupSessionMessageIds", { required: true });
    // TODO eventually this should be mandatory
    t.int("schemaVersion", { required: false });
    // TODO eventually this should be mandatory
    t.string("schemaVersionSignature", { required: false });
  },
});

export const UpdateRepositoryContentResult = objectType({
  name: "UpdateRepositoryContentResult",
  definition(t) {
    t.field("content", {
      type: "Content",
      nullable: true,
    });
  },
});

export const UpdateRepositoryContentAndGroupSessionInput = inputObjectType({
  name: "UpdateRepositoryContentAndGroupSessionInput",
  definition(t) {
    t.id("repositoryId", { required: true });
    t.string("encryptedContent", { required: true });
    t.list.field("groupSessionMessages", {
      type: "GroupSessionMessageInput",
      required: false,
    });
    // TODO eventually this should be mandatory
    t.int("schemaVersion", { required: false });
    // TODO eventually this should be mandatory
    t.string("schemaVersionSignature", { required: false });
  },
});

export const UpdateRepositoryContentAndGroupSessionResult = objectType({
  name: "UpdateRepositoryContentAndGroupSessionResult",
  definition(t) {
    t.field("content", {
      type: "Content",
      nullable: true,
    });
    t.list.id("groupSessionMessageIds", { nullable: true });
  },
});

export const PrivateInfoGroupSessionMessageInput = inputObjectType({
  name: "PrivateInfoGroupSessionMessageInput",
  definition(t) {
    t.int("type", { required: true });
    t.string("body", { required: true });
    t.string("targetDeviceIdKey", { required: true });
  },
});

export const UpdatePrivateInfoInput = inputObjectType({
  name: "UpdatePrivateInfoInput",
  definition(t) {
    t.string("encryptedContent", { required: true });
    t.list.field("privateInfoGroupSessionMessages", {
      type: "PrivateInfoGroupSessionMessageInput",
      required: false,
    });
  },
});

export const UpdatePrivateInfoResult = objectType({
  name: "UpdatePrivateInfoResult",
  definition(t) {
    t.field("privateInfoContent", {
      type: "PrivateInfoContent",
      nullable: true,
    });
  },
});

export const RepositoryGroupMessagesInput = inputObjectType({
  name: "RepositoryGroupMessagesInput",
  definition(t) {
    t.id("repositoryId", { required: true });
    t.field("groupSessionMessage", {
      type: "GroupSessionMessageInput",
      required: true,
    });
  },
});

export const MultiRepositoryGroupMessagesInput = inputObjectType({
  name: "MultiRepositoryGroupMessagesInput",
  definition(t) {
    t.id("repositoryId", { required: true });
    t.list.field("groupSessionMessages", {
      type: "GroupSessionMessageInput",
      required: false,
    });
  },
});

export const AddDeviceInput = inputObjectType({
  name: "AddDeviceInput",
  definition(t) {
    t.field("device", {
      type: "DeviceInput",
      required: true,
    });
    t.string("verificationMessage", { required: true });
    t.string("serverSecret", { required: true });
  },
});

export const AddDeviceResult = objectType({
  name: "AddDeviceResult",
  definition(t) {
    t.boolean("success", { nullable: true });
  },
});

export const CreateContactInvitationInput = inputObjectType({
  name: "CreateContactInvitationInput",
  definition(t) {
    t.string("serverSecret", { required: true });
  },
});

export const CreateContactInvitationResult = objectType({
  name: "CreateContactInvitationResult",
  definition(t) {
    t.field("contactInvitation", {
      type: "ContactInvitation",
      nullable: true,
    });
  },
});

export const AcceptContactInvitationInput = inputObjectType({
  name: "AcceptContactInvitationInput",
  definition(t) {
    t.string("userId", { required: true });
    t.string("userSigningKey", { required: true });
    t.string("serverSecret", { required: true });
    t.string("signature", { required: true });
    t.string("contactInfoMessage", { required: true });
  },
});

export const AcceptContactInvitationResult = objectType({
  name: "AcceptContactInvitationResult",
  definition(t) {
    t.field("contactInvitation", {
      type: "ContactInvitation",
      nullable: true,
    });
  },
});

export const CompleteContactInvitationInput = inputObjectType({
  name: "CompleteContactInvitationInput",
  definition(t) {
    t.string("contactInvitationId", { required: true });
    t.string("userId", { required: true });
    t.string("userSigningKey", { required: true });
    t.string("signature", { required: true });
  },
});

export const CompleteContactInvitationResult = objectType({
  name: "CompleteContactInvitationResult",
  definition(t) {
    t.field("contactInvitation", {
      type: "ContactInvitation",
      nullable: true,
    });
  },
});

export const SendOneTimeKeysInput = inputObjectType({
  name: "SendOneTimeKeysInput",
  definition(t) {
    t.list.field("oneTimeKeys", { type: "OneTimeKeyInput", required: true });
  },
});

export const SendOneTimeKeysResult = objectType({
  name: "SendOneTimeKeysResult",
  definition(t) {
    t.field("device", {
      type: "Device",
      nullable: true,
    });
  },
});

export const ClaimOneTimeKeysForMultipleDevicesInput = inputObjectType({
  name: "ClaimOneTimeKeysForMultipleDevicesInput",
  definition(t) {
    t.string("requestId", { required: false });
    t.list.string("deviceIdKeys", { required: true });
  },
});

export const ClaimOneTimeKeysForMultipleDevicesResult = objectType({
  name: "ClaimOneTimeKeysForMultipleDevicesResult",
  definition(t) {
    t.list.field("oneTimeKeysWithDeviceIdKey", {
      type: "OneTimeKeyWithDeviceIdKey",
      nullable: true,
    });
  },
});

export const RemoveOneTimeKeyInput = inputObjectType({
  name: "RemoveOneTimeKeyInput",
  definition(t) {
    t.string("key", { required: true });
  },
});

export const RemoveOneTimeKeyResult = objectType({
  name: "RemoveOneTimeKeyResult",
  definition(t) {
    t.boolean("success", { nullable: true });
  },
});

export const AddCollaboratorToRepositoriesInput = inputObjectType({
  name: "AddCollaboratorToRepositoriesInput",
  definition(t) {
    t.list.field("repositoryGroupMessages", {
      type: "MultiRepositoryGroupMessagesInput",
      required: true,
    });
    t.id("contactId", { required: true });
  },
});

export const AddCollaboratorToRepositoriesResultEntry = objectType({
  name: "AddCollaboratorToRepositoriesResultEntry",
  definition(t) {
    t.id("repositoryId", { nullable: true });
    t.list.id("groupSessionMessageIds", { nullable: true });
  },
});

export const AddCollaboratorToRepositoriesResult = objectType({
  name: "AddCollaboratorToRepositoriesResult",
  definition(t) {
    t.list.field("entries", {
      type: "AddCollaboratorToRepositoriesResultEntry",
      nullable: true,
    });
  },
});

export const DeleteDeviceInput = inputObjectType({
  name: "DeleteDeviceInput",
  definition(t) {
    t.id("deviceIdKey", { required: true });
  },
});

export const DeleteDeviceResult = objectType({
  name: "DeleteDeviceResult",
  definition(t) {
    t.boolean("success", { nullable: true });
  },
});

export const DeleteRepositoryInput = inputObjectType({
  name: "DeleteRepositoryInput",
  definition(t) {
    t.id("repositoryId", { required: true });
  },
});

export const DeleteRepositoryResult = objectType({
  name: "DeleteRepositoryResult",
  definition(t) {
    t.boolean("success", { nullable: true });
  },
});

export const DeleteUserInput = inputObjectType({
  name: "DeleteUserInput",
  definition(t) {
    t.id("userId", { required: false });
  },
});

export const DeleteUserResult = objectType({
  name: "DeleteUserResult",
  definition(t) {
    t.boolean("success", { nullable: true });
  },
});

export const DeleteContactInvitationInput = inputObjectType({
  name: "DeleteContactInvitationInput",
  definition(t) {
    t.id("contactInvitationId", { required: true });
  },
});

export const DeleteContactInvitationResult = objectType({
  name: "DeleteContactInvitationResult",
  definition(t) {
    t.boolean("success", { nullable: true });
  },
});

export const DeleteContactInput = inputObjectType({
  name: "DeleteContactInput",
  definition(t) {
    t.id("contactId", { required: true });
  },
});

export const DeleteContactResult = objectType({
  name: "DeleteContactResult",
  definition(t) {
    t.boolean("success", { nullable: true });
  },
});

export const RemoveCollaboratorFromRepositoryInput = inputObjectType({
  name: "RemoveCollaboratorFromRepositoryInput",
  definition(t) {
    t.id("repositoryId", { required: true });
    t.id("collaboratorId", { required: true });
  },
});

export const RemoveCollaboratorFromRepositoryResult = objectType({
  name: "RemoveCollaboratorFromRepositoryResult",
  definition(t) {
    t.field("repository", {
      type: "Repository",
      nullable: true,
    });
  },
});

export const SendBillingAccountAuthEmailInput = inputObjectType({
  name: "SendBillingAccountAuthEmailInput",
  definition(t) {
    t.string("email", { required: true });
  },
});

export const SendBillingAccountAuthEmailResult = objectType({
  name: "SendBillingAccountAuthEmailResult",
  definition(t) {
    t.boolean("success", { nullable: true });
  },
});

export const AuthenticateBillingAccountInput = inputObjectType({
  name: "AuthenticateBillingAccountInput",
  definition(t) {
    t.string("emailToken", { required: true });
  },
});

export const AuthenticateBillingAccountResult = objectType({
  name: "AuthenticateBillingAccountResult",
  definition(t) {
    t.boolean("success", { nullable: true });
  },
});

export const LogoutBillingAccountResult = objectType({
  name: "LogoutBillingAccountResult",
  definition(t) {
    t.boolean("success", { nullable: true });
  },
});

export const AddUserToLicenseInput = inputObjectType({
  name: "AddUserToLicenseInput",
  definition(t) {
    t.id("licenseId", { required: true });
    t.id("userId", { required: true });
  },
});

export const AddUserToLicenseResult = objectType({
  name: "AddUserToLicenseResult",
  definition(t) {
    t.field("license", { type: "License", nullable: true });
  },
});

export const RefreshLicenseTokenAndRemoveUserInput = inputObjectType({
  name: "RefreshLicenseTokenAndRemoveUserInput",
  definition(t) {
    t.id("licenseId", { required: true });
  },
});

export const RefreshLicenseTokenAndRemoveUserResult = objectType({
  name: "RefreshLicenseTokenAndRemoveUserResult",
  definition(t) {
    t.field("license", { type: "License", nullable: true });
  },
});

export const ConnectToLicenseInput = inputObjectType({
  name: "ConnectToLicenseInput",
  definition(t) {
    t.id("licenseToken", { required: true });
  },
});

export const ConnectToLicenseResult = objectType({
  name: "ConnectToLicenseResult",
  definition(t) {
    t.string("licenseToken", { nullable: true });
  },
});

export const DisconnectFromLicenseInput = inputObjectType({
  name: "DisconnectFromLicenseInput",
  definition(t) {
    t.id("licenseToken", { required: true });
  },
});

export const DisconnectFromLicenseResult = objectType({
  name: "DisconnectFromLicenseResult",
  definition(t) {
    t.boolean("success", { nullable: true });
  },
});

export const Mutation = mutationType({
  definition(t) {
    t.field("createUser", {
      type: "CreateUserResult",
      nullable: true,
      args: {
        input: arg({
          type: "CreateUserInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        // @ts-ignore
        const oneTimeKeys = args.input.device.oneTimeKeys
          .filter(notEmpty)
          .map((oneTimeKey) => {
            return {
              key: oneTimeKey.key,
              signature: oneTimeKey.signature,
            };
          });
        const user = await prisma.user.create({
          data: {
            devices: {
              create: {
                idKey: args.input.device.idKey,
                oneTimeKeys: {
                  create: oneTimeKeys,
                },
                signingKey: args.input.device.signingKey,
                signatures: {
                  set: args.input.device.signature,
                },
                fallbackKey: args.input.device.fallbackKey,
                // TODO verify the signature is valid
                fallbackKeySignature: args.input.device.fallbackKeySignature,
              },
            },
            signingKeys: {
              set: args.input.signingKey,
            },
          },
          include: { devices: true },
        });
        return { user };
      },
    });
    t.field("createRepository", {
      type: "CreateRepositoryResult",
      nullable: true,
      args: {
        input: arg({
          type: "CreateRepositoryInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        // TODO verify that the updates created are created for all collaborators (incl all devices)

        const currentUser =
          // @ts-ignore
          (await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage)).user;
        const contentObject = JSON.parse(args.input.content.encryptedContent);
        const device = await prisma.device.findUnique({
          where: { idKey: contentObject.senderIdKey },
          include: { user: true },
        });
        if (!device) {
          throw new Error("Device not found.");
        }
        if (device.user.id !== currentUser.id) {
          throw new Error("Authorization failed.");
        }

        const repository = await prisma.repository.create({
          data: {
            creator: { connect: { id: currentUser.id } },
            collaborators: { connect: { id: currentUser.id } },
            lastContentUpdateIntegrityId: uuidv4(),
            content: {
              create: {
                device: { connect: { id: device.id } },
                encryptedContent: args.input.content.encryptedContent,
                groupSessionMessages: {
                  create:
                    args.input.content.groupSessionMessages?.filter(notEmpty),
                },
                schemaVersion: args.input.content.schemaVersion,
                schemaVersionSignature:
                  args.input.content.schemaVersionSignature,
              },
            },
          },
          include: {
            collaborators: true,
            content: { include: { groupSessionMessages: true } },
          },
        });

        return {
          repository,
          // there must be the one content entry that just has been created
          groupSessionMessageIds:
            repository.content[0].groupSessionMessages.map(
              (groupSessionMessage: any) => groupSessionMessage.id
            ),
        };
      },
    });
    t.field("updateRepositoryContent", {
      type: "UpdateRepositoryContentResult",
      nullable: true,
      args: {
        input: arg({
          type: "UpdateRepositoryContentInput",
          required: true,
        }),
      },
      // @ts-ignore
      async resolve(root, args, ctx) {
        // TODO verify that the updates created are created for all collaborators (incl all devices)

        const currentUser =
          // @ts-ignore
          (await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage)).user;
        const contentObject = JSON.parse(args.input.encryptedContent);
        const device = await prisma.device.findUnique({
          where: { idKey: contentObject.senderIdKey },
          include: { user: true },
        });
        if (!device) {
          throw new Error("Device not found.");
        }
        if (device.user.id !== currentUser.id) {
          throw new Error("Authorization failed.");
        }
        await assertIsCollaborator({
          repositoryId: args.input.repositoryId,
          userId: currentUser.id,
        });

        const contentPromise = prisma.content.create({
          data: {
            device: { connect: { id: device.id } },
            repository: {
              connect: {
                id: args.input.repositoryId,
              },
            },
            encryptedContent: args.input.encryptedContent,
            groupSessionMessages: {
              // @ts-ignore
              connect: args.input.groupSessionMessageIds.map((id) => ({ id })),
            },
            schemaVersion: args.input.schemaVersion,
            schemaVersionSignature: args.input.schemaVersionSignature,
          },
        });
        const repositoryUpdatePromise = prisma.repository.update({
          where: { id: args.input.repositoryId },
          data: {
            lastContentUpdateIntegrityId: uuidv4(),
          },
        });

        const [content] = await prisma.$transaction([
          contentPromise,
          repositoryUpdatePromise,
        ]);

        return { content };
      },
    });

    t.field("updateRepositoryContentAndGroupSession", {
      type: "UpdateRepositoryContentAndGroupSessionResult",
      nullable: true,
      args: {
        input: arg({
          type: "UpdateRepositoryContentAndGroupSessionInput",
          required: true,
        }),
      },
      // @ts-ignore
      async resolve(root, args, ctx) {
        // TODO verify that the updates created are created for all collaborators (incl all devices)

        const currentUser =
          // @ts-ignore
          (await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage)).user;
        const contentObject = JSON.parse(args.input.encryptedContent);
        const device = await prisma.device.findUnique({
          where: { idKey: contentObject.senderIdKey },
          include: { user: true },
        });
        if (!device) {
          throw new Error("Device not found.");
        }
        if (device.user.id !== currentUser.id) {
          throw new Error("Authorization failed.");
        }
        await assertIsCollaborator({
          repositoryId: args.input.repositoryId,
          userId: currentUser.id,
        });

        const contentPromise = prisma.content.create({
          data: {
            device: { connect: { id: device.id } },
            repository: {
              connect: {
                id: args.input.repositoryId,
              },
            },
            encryptedContent: args.input.encryptedContent,
            groupSessionMessages: {
              create: args.input.groupSessionMessages?.filter(notEmpty),
            },
            schemaVersion: args.input.schemaVersion,
            schemaVersionSignature: args.input.schemaVersionSignature,
          },
          include: { groupSessionMessages: true },
        });

        const repositoryUpdatePromise = prisma.repository.update({
          where: { id: args.input.repositoryId },
          data: {
            lastContentUpdateIntegrityId: uuidv4(),
          },
        });

        const [content] = await prisma.$transaction([
          contentPromise,
          repositoryUpdatePromise,
        ]);

        return {
          content,
          // there must be the one content entry that just has been created
          groupSessionMessageIds: content.groupSessionMessages.map(
            (groupSessionMessage) => groupSessionMessage.id
          ),
        };
      },
    });

    t.field("updatePrivateInfo", {
      type: "UpdatePrivateInfoResult",
      nullable: true,
      args: {
        input: arg({
          type: "UpdatePrivateInfoInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const currentUser =
          // @ts-ignore
          (await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage)).user;
        const contentObject = JSON.parse(args.input.encryptedContent);
        const device = await prisma.device.findUnique({
          where: { idKey: contentObject.senderIdKey },
          include: { user: true },
        });
        if (!device) {
          throw new Error("Device not found.");
        }
        if (device.user.id !== currentUser.id) {
          throw new Error("Authorization failed.");
        }

        const privateInfoContent = await prisma.privateInfoContent.create({
          data: {
            device: { connect: { id: device.id } },
            encryptedContent: args.input.encryptedContent,
            privateInfoGroupSessionMessages: {
              create:
                args.input.privateInfoGroupSessionMessages?.filter(notEmpty),
            },
          },
          include: { privateInfoGroupSessionMessages: true },
        });
        return {
          privateInfoContent,
        };
      },
    });

    t.field("addDevice", {
      type: "AddDeviceResult",
      nullable: true,
      args: {
        input: arg({
          type: "AddDeviceInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const currentUser = sessionInfo.user;

        await prisma.device.create({
          data: {
            idKey: args.input.device.idKey,
            user: {
              connect: { id: currentUser.id },
            },
            signingKey: args.input.device.signingKey,
            signatures: {
              set: args.input.device.signature,
            },
            fallbackKey: args.input.device.fallbackKey,
            // TODO verify the signature is valid
            fallbackKeySignature: args.input.device.fallbackKeySignature,
          },
        });

        await prisma.addDeviceVerification.create({
          data: {
            deviceIdKey: args.input.device.idKey,
            verificationMessage: args.input.verificationMessage,
            serverSecret: args.input.serverSecret,
          },
        });

        return { success: true };
      },
    });

    t.field("sendOneTimeKeys", {
      type: "SendOneTimeKeysResult",
      nullable: true,
      args: {
        input: arg({
          type: "SendOneTimeKeysInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const { device } =
          // @ts-ignore
          await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage);
        // @ts-ignore
        const oneTimeKeys = args.input.oneTimeKeys
          .filter(notEmpty)
          .map((oneTimeKey) => {
            return {
              key: oneTimeKey.key,
              signature: oneTimeKey.signature,
            };
          });
        const updatedDevice = await prisma.device.update({
          where: { id: device.id },
          data: { oneTimeKeys: { create: oneTimeKeys } },
        });

        return { device: updatedDevice };
      },
    });

    t.field("claimOneTimeKeysForMultipleDevices", {
      type: "ClaimOneTimeKeysForMultipleDevicesResult",
      nullable: true,
      args: {
        input: arg({
          type: "ClaimOneTimeKeysForMultipleDevicesInput",
          required: true,
        }),
      },
      // @ts-ignore
      async resolve(root, args, ctx) {
        const sessionInfo =
          // @ts-ignore
          await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage);
        const currentDevice = sessionInfo.device;

        // TODO authorization: verify that the user can fetch this onetimekey

        // Postgres queues explaind: https://www.2ndquadrant.com/en/blog/what-is-select-skip-locked-for-in-postgresql-9-5/
        // @ts-ignore
        const oneTimeKeyRequests = args.input.deviceIdKeys.map(
          async (deviceIdKey) => {
            if (!deviceIdKey) return null;
            // can be avoided by using a join in the nested SELECT in the UPDATE query
            const device = await prisma.device.findUnique({
              where: { idKey: deviceIdKey },
            });
            if (!device) return null;
            const oneTimeKeyResult = await prisma.$queryRaw<OneTimeKey[]>`
              UPDATE "OneTimeKey"
              SET "claimedByDeviceId" = ${currentDevice.id}
              WHERE "key" = (
                  SELECT "key"
                  FROM "OneTimeKey"
                  WHERE "deviceId" = ${device.id}
                  AND "claimedByDeviceId" IS NULL
                  FOR UPDATE SKIP LOCKED
                  LIMIT 1
              )
              RETURNING *;`;
            if (oneTimeKeyResult.length > 0) {
              return {
                oneTimeKey: oneTimeKeyResult[0],
                deviceIdKey,
              };
            } else {
              return {
                oneTimeKey: {
                  key: device.fallbackKey,
                  signature: device.fallbackKeySignature,
                },
                deviceIdKey,
              };
            }
          }
        );
        const updatedOneTimeKeysWithDeviceIdKey = await Promise.all(
          oneTimeKeyRequests
        );

        return {
          oneTimeKeysWithDeviceIdKey: updatedOneTimeKeysWithDeviceIdKey.filter(
            (updatedOneTimeKeys) => updatedOneTimeKeys !== null
          ),
        };
      },
    });

    t.field("removeOneTimeKey", {
      type: "RemoveOneTimeKeyResult",
      nullable: true,
      args: {
        input: arg({
          type: "RemoveOneTimeKeyInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const currentDevice =
          // @ts-ignore
          await (
            await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage)
          ).device;

        const batchResult = await prisma.oneTimeKey.deleteMany({
          where: {
            key: args.input.key,
            deviceId: currentDevice.id,
          },
        });

        return { success: batchResult.count > 0 ? true : false };
      },
    });

    t.field("createContactInvitation", {
      type: "CreateContactInvitationResult",
      nullable: true,
      args: {
        input: arg({
          type: "CreateContactInvitationInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const currentUser = sessionInfo.user;
        const contactInvitation = await prisma.contactInvitation.create({
          data: {
            signingKey: currentUser.signingKeys[0],
            user: {
              connect: {
                id: currentUser.id,
              },
            },
            serverSecret: args.input.serverSecret,
            status: "PENDING",
          },
        });

        return { contactInvitation };
      },
    });

    t.field("acceptContactInvitation", {
      type: "AcceptContactInvitationResult",
      nullable: true,
      args: {
        input: arg({
          type: "AcceptContactInvitationInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const currentUser = sessionInfo.user;

        const contactInvitations = await prisma.contactInvitation.findMany({
          where: {
            status: "PENDING",
            signingKey: args.input.userSigningKey,
            userId: args.input.userId,
            serverSecret: args.input.serverSecret,
          },
          take: 1,
        });

        if (contactInvitations.length === 0) {
          throw new Error("Can't accept this invitation.");
        }

        const contactInvitation = await prisma.contactInvitation.update({
          where: {
            id: contactInvitations[0].id,
          },
          data: {
            status: "ACCEPTED",
            contactInfoMessage: args.input.contactInfoMessage,
          },
        });

        // TODO verify args.input.signingKey exists (to avoid false/broken contacts being added)
        // TODO verify the args.input.userId and signature belong to the same user

        await prisma.contact.create({
          data: {
            signingKey: currentUser.signingKeys[0],
            contactSigningKey: args.input.userSigningKey,
            signatures: {
              set: args.input.signature,
            },
            user: {
              connect: {
                id: currentUser.id,
              },
            },
            contactUser: {
              connect: {
                id: args.input.userId,
              },
            },
          },
        });

        return { contactInvitation };
      },
    });

    t.field("completeContactInvitation", {
      type: "CompleteContactInvitationResult",
      nullable: true,
      args: {
        input: arg({
          type: "CompleteContactInvitationInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const currentUser = sessionInfo.user;
        const contactInvitation = await prisma.contactInvitation.update({
          where: { id: args.input.contactInvitationId },
          data: { status: "COMPLETED" },
        });
        if (!contactInvitation) {
          throw new Error("Can't update this invitation.");
        }

        // TODO verify args.input.signingKey exists (to avoid false/broken contacts being added)
        // TODO verify the args.input.userId and signature belong to the same user
        await prisma.contact.create({
          data: {
            signingKey: currentUser.signingKeys[0],
            contactSigningKey: args.input.userSigningKey,
            signatures: {
              set: args.input.signature,
            },
            user: {
              connect: {
                id: currentUser.id,
              },
            },
            contactUser: {
              connect: {
                id: args.input.userId,
              },
            },
          },
        });

        return { contactInvitation };
      },
    });

    // On the client for everyone a new groupSessionMessage is created.
    // I think by only adding someone to an existing outbound group session
    // this would not be needed. Therefor all groupSessionMessage must/should? be updated.
    // TODO change addCollaboratorToRepository to simply create a new content entry
    // with a new groupSession to make sure new devices/collaborators can't decrypt
    // old content.
    t.field("addCollaboratorToRepositories", {
      type: "AddCollaboratorToRepositoriesResult",
      nullable: true,
      args: {
        input: arg({
          type: "AddCollaboratorToRepositoriesInput",
          required: true,
        }),
      },
      // @ts-ignore TODO
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const currentUser = sessionInfo.user;
        const currentDevice = sessionInfo.device;
        const results = await Promise.all(
          // @ts-ignore
          args.input.repositoryGroupMessages.map(async (item) => {
            // TODO move auth check before doing anything!
            await assertIsCollaborator({
              // @ts-ignore
              repositoryId: item.repositoryId,
              userId: currentUser.id,
            });
            const contentResult = await prisma.content.findMany({
              where: {
                // @ts-ignore
                repositoryId: item.repositoryId,
                deviceId: currentDevice.id,
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            });
            if (contentResult.length === 0) {
              return;
            }
            const contact = await prisma.contact.findUnique({
              where: { id: args.input.contactId },
              include: { user: true },
            });
            if (!contact) {
              return;
            }

            await prisma.repository.update({
              // @ts-ignore
              where: { id: item.repositoryId },
              data: {
                collaborators: { connect: { id: contact.contactUserId } },
              },
            });
            const content = contentResult[0];
            // @ts-ignore
            if (item.groupSessionMessages) {
              await Promise.all(
                // @ts-ignore
                item.groupSessionMessages?.map(async (groupSessionMessage) => {
                  await prisma.content.update({
                    where: { id: content.id },
                    data: {
                      // @ts-ignore
                      groupSessionMessages: { create: groupSessionMessage },
                    },
                  });
                })
              );
            }
            const content2 = await prisma.content.findUnique({
              where: { id: content.id },
              include: { groupSessionMessages: true },
            });
            return {
              // @ts-ignore
              repositoryId: item.repositoryId,
              groupSessionMessageIds: content2
                ? content2.groupSessionMessages.map(
                    (groupSessionMessage: any) => groupSessionMessage.id
                  )
                : [],
            };
          })
        );

        return { entries: results };
      },
    });

    t.field("removeCollaboratorFromRepository", {
      type: "RemoveCollaboratorFromRepositoryResult",
      nullable: true,
      args: {
        input: arg({
          type: "RemoveCollaboratorFromRepositoryInput",
          required: true,
        }),
      },
      // @ts-ignore TODO
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const currentUser = sessionInfo.user;

        const repo = await prisma.repository.findUnique({
          where: { id: args.input.repositoryId },
          include: {
            collaborators: { select: { id: true } },
          },
        });
        if (!repo) {
          throw new Error("Authorization failed.");
        }

        const hasAccessToRepo = repo.collaborators.some(
          (collaborator) => collaborator.id === currentUser.id
        );
        if (!hasAccessToRepo) {
          throw new Error("Authorization failed.");
        }
        // only the creator can remove others or a user themselves
        if (
          repo.creatorId !== currentUser.id &&
          currentUser.id !== args.input.collaboratorId
        ) {
          throw new Error("Authorization failed.");
        }
        if (repo.creatorId === args.input.collaboratorId) {
          throw new Error(
            "Creators can't remove themselves from a repository."
          );
        }

        const collaboratorToRemove = await prisma.user.findUnique({
          where: { id: args.input.collaboratorId },
          include: { devices: { select: { idKey: true } } },
        });
        if (!collaboratorToRemove) {
          throw new Error("Can't find the user.");
        }

        const deviceIdKeys = collaboratorToRemove.devices.map(
          (device) => device.idKey
        );

        // remove all the groupsession messages connected to the user
        // which is important in case the user gets re-added since
        // these groupSessionMessages would not be valid anymore
        // because the client is supposed to remove all local data related
        // to that repository
        await prisma.groupSessionMessage.deleteMany({
          where: {
            targetDeviceIdKey: { in: deviceIdKeys },
            content: { repositoryId: args.input.repositoryId },
          },
        });

        await prisma.repositoryEvents.create({
          data: {
            type: "DELETE",
            repositoryId: args.input.repositoryId,
            affectedCollaborators: {
              connect: { id: args.input.collaboratorId },
            },
          },
        });
        const updatedRepository = await prisma.repository.update({
          where: {
            id: args.input.repositoryId,
          },
          data: {
            collaborators: { disconnect: { id: args.input.collaboratorId } },
          },
        });

        return { repository: updatedRepository };
      },
    });

    t.field("deleteDevice", {
      type: "DeleteDeviceResult",
      nullable: true,
      args: {
        input: arg({
          type: "DeleteDeviceInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );

        const device = await prisma.device.findFirst({
          where: { idKey: args.input.deviceIdKey, userId: sessionInfo.user.id },
        });
        if (!device) {
          throw new Error("Authorization failed.");
        }
        const devicesCount = await prisma.device.count({
          where: { userId: sessionInfo.user.id },
        });
        if (devicesCount <= 1) {
          throw new Error(
            "Can't remove the last device. Please delete the account instead."
          );
        }

        const removeDevicePromises = await getDeleteDevicePromises({
          device,
          userId: sessionInfo.user.id,
        });
        // @ts-ignore
        await prisma.$transaction(removeDevicePromises);

        return { success: true };
      },
    });

    t.field("deleteUser", {
      type: "DeleteUserResult",
      nullable: true,
      args: {
        input: arg({
          type: "DeleteUserInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const currentUser = sessionInfo.user;

        const reposWithOtherCollaborators = await prisma.repository.findMany({
          where: {
            creatorId: currentUser.id,
            collaborators: { some: { NOT: { id: currentUser.id } } },
          },
          include: {
            collaborators: { select: { id: true } },
          },
        });

        const userWithLicenses = await prisma.license.findMany({
          where: { userId: currentUser.id },
        });
        const createdRepositories = await prisma.repository.findMany({
          where: { creatorId: currentUser.id },
        });
        const createdRepositoriesIds = createdRepositories.map(
          (repo) => repo.id
        );
        const contentEntries = await prisma.content.findMany({
          where: { repositoryId: { in: createdRepositoriesIds } },
          select: { id: true },
        });
        const contentIds = contentEntries.map(({ id }) => id);

        const devices = await prisma.device.findMany({
          where: { userId: currentUser.id },
        });

        for (const device of devices) {
          const promises = await getDeleteDevicePromises({
            device,
            userId: currentUser.id,
          });
          // TODO the delete device promises should happen in one transaction
          // @ts-ignore
          await prisma.$transaction(promises);
        }

        const repositoryTombstonesPromises = reposWithOtherCollaborators.map(
          (repo) => {
            return prisma.repositoryEvents.create({
              data: {
                type: "DELETE",
                repositoryId: repo.id,
                affectedCollaborators: {
                  connect: repo.collaborators.filter((collaborator) => {
                    return collaborator.id !== currentUser.id;
                  }),
                },
              },
            });
          }
        );
        const deleteGroupSessionMessagePromise =
          prisma.groupSessionMessage.deleteMany({
            where: { contentId: { in: contentIds } },
          });
        const deleteContentPromise = prisma.content.deleteMany({
          where: { repositoryId: { in: createdRepositoriesIds } },
        });
        const deleteRepositoriesPromise = prisma.repository.deleteMany({
          where: { id: { in: createdRepositoriesIds } },
        });
        const licenseUpdatePromises = userWithLicenses.map((license) => {
          return prisma.license.update({
            where: { id: license.id },
            data: { user: { disconnect: true } },
          });
        });

        const deleteContactInvitationsPromise =
          prisma.contactInvitation.deleteMany({
            where: {
              OR: [
                { acceptedByUserId: currentUser.id },
                { userId: currentUser.id },
              ],
            },
          });
        const deleteContactsPromise = prisma.contact.deleteMany({
          where: {
            OR: [{ contactUserId: currentUser.id }, { userId: currentUser.id }],
          },
        });
        const deleteUserPromise = prisma.user.delete({
          where: { id: currentUser.id },
        });
        const createUserTombstonePromise = prisma.userTombstone.create({
          data: { id: currentUser.id },
        });

        // @ts-ignore
        await prisma.$transaction([
          ...repositoryTombstonesPromises,
          deleteGroupSessionMessagePromise,
          deleteContentPromise,
          deleteRepositoriesPromise,
          deleteContactInvitationsPromise,
          deleteContactsPromise,
          ...licenseUpdatePromises,
          deleteUserPromise,
          createUserTombstonePromise,
        ]);

        return { success: true };
      },
    });

    t.field("deleteRepository", {
      type: "DeleteRepositoryResult",
      nullable: true,
      args: {
        input: arg({
          type: "DeleteRepositoryInput",
          required: true,
        }),
      },
      // @ts-ignore TODO
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const currentUser = sessionInfo.user;

        const repo = await prisma.repository.findUnique({
          where: { id: args.input.repositoryId },
          include: {
            collaborators: { select: { id: true } },
          },
        });
        if (!repo || repo.creatorId !== currentUser.id) {
          throw new Error("Authorization failed.");
        }

        const contentIds = await prisma.content.findMany({
          where: { repositoryId: args.input.repositoryId },
          select: { id: true },
        });
        // TODO place Event entry creation and all deletes in a transaction
        await prisma.repositoryEvents.create({
          data: {
            type: "DELETE",
            repositoryId: args.input.repositoryId,
            affectedCollaborators: { connect: repo.collaborators },
          },
        });
        await prisma.groupSessionMessage.deleteMany({
          where: {
            contentId: { in: contentIds.map(({ id }) => id) },
          },
        });
        await prisma.content.deleteMany({
          where: { repositoryId: args.input.repositoryId },
        });
        await prisma.repository.delete({
          where: { id: args.input.repositoryId },
        });

        return { success: true };
      },
    });

    t.field("deleteContactInvitation", {
      type: "DeleteContactInvitationResult",
      nullable: true,
      args: {
        input: arg({
          type: "DeleteContactInvitationInput",
          required: true,
        }),
      },
      // @ts-ignore TODO
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const currentUser = sessionInfo.user;
        const contactInvitation = await prisma.contactInvitation.findUnique({
          where: { id: args.input.contactInvitationId },
        });
        if (!contactInvitation || contactInvitation.userId !== currentUser.id) {
          throw new Error("Authorization failed.");
        }

        await prisma.contactInvitation.delete({
          where: { id: args.input.contactInvitationId },
        });

        return { success: true };
      },
    });

    t.field("deleteContact", {
      type: "DeleteContactResult",
      nullable: true,
      args: {
        input: arg({
          type: "DeleteContactInput",
          required: true,
        }),
      },
      // @ts-ignore TODO
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const currentUser = sessionInfo.user;
        const contact = await prisma.contact.findUnique({
          where: { id: args.input.contactId },
        });
        if (!contact || contact.userId !== currentUser.id) {
          throw new Error("Authorization failed.");
        }

        await prisma.contact.delete({
          where: { id: args.input.contactId },
        });

        return { success: true };
      },
    });

    t.field("sendBillingAccountAuthEmail", {
      type: "SendBillingAccountAuthEmailResult",
      nullable: true,
      args: {
        input: arg({
          type: "SendBillingAccountAuthEmailInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const billingAcount = await prisma.billingAccount.findFirst({
          where: { email: args.input.email },
        });
        if (billingAcount) {
          const rawEmailToken = uuidv4();
          const expiration = new Date();
          expiration.setMinutes(expiration.getMinutes() + 15);
          const billingAccountEmailToken =
            await prisma.billingAccountEmailToken.create({
              data: {
                email: billingAcount.email,
                // why sha256: https://security.stackexchange.com/a/151262
                emailToken: crypto
                  .createHash("sha256")
                  .update(rawEmailToken)
                  .digest("base64"),

                expiration,
              },
            });
          if (billingAccountEmailToken) {
            await sendBillingAccountAuthEmail(
              billingAccountEmailToken.email,
              rawEmailToken
            );
            return { success: true };
          }
        }
        return { success: false };
      },
    });

    t.field("authenticateBillingAccount", {
      type: "AuthenticateBillingAccountResult",
      nullable: true,
      args: {
        input: arg({
          type: "AuthenticateBillingAccountInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx: CustomContext) {
        // why sha256: https://security.stackexchange.com/a/151262
        const emailToken = crypto
          .createHash("sha256")
          .update(args.input.emailToken)
          .digest("base64");
        const billingAccountEmailToken =
          await prisma.billingAccountEmailToken.findUnique({
            where: { emailToken },
          });

        // TODO test expiration check
        if (
          billingAccountEmailToken &&
          billingAccountEmailToken.emailTokenUsed === false &&
          new Date() <= new Date(billingAccountEmailToken.expiration)
        ) {
          const billingAcount = await prisma.billingAccount.findFirst({
            where: { email: billingAccountEmailToken.email },
          });
          if (!billingAcount) {
            throw new Error("Authentication failed");
          }
          await prisma.billingAccountEmailToken.update({
            where: { emailToken },
            data: { emailTokenUsed: true },
          });
          const rawAuthToken = uuidv4();
          const expiration = new Date();
          expiration.setDate(expiration.getDate() + 7);
          await prisma.billingAccountAuthToken.create({
            data: {
              billingAccount: { connect: { id: billingAcount.id } },
              expiration,
              // why sha256: https://security.stackexchange.com/a/151262
              token: crypto
                .createHash("sha256")
                .update(rawAuthToken)
                .digest("base64"),
            },
          });

          ctx.setCookie("billing_auth", rawAuthToken, {
            domain: isProd ? "serenity.re" : undefined,
            httpOnly: true,
            secure: isProd,
            sameSite: "lax",
            expires: expiration,
          });
          ctx.setCookie("billing_auth_active", "true", {
            domain: isProd ? "serenity.re" : undefined,
            httpOnly: false,
            secure: isProd,
            sameSite: "lax",
            expires: expiration,
          });
          return { success: true };
        }
        throw new Error("Authentication failed");
      },
    });

    t.field("logoutBillingAccount", {
      type: "LogoutBillingAccountResult",
      nullable: true,
      async resolve(root, args, ctx: CustomContext) {
        const { billingAccountAuthToken } = await getBillingAccountByAuthToken(
          ctx.billingAccountAuthToken
        );
        await prisma.billingAccountAuthToken.delete({
          where: { token: billingAccountAuthToken.token },
        });
        ctx.clearCookie("billing_auth", {
          domain: isProd ? "serenity.re" : undefined,
        });
        ctx.clearCookie("billing_auth_active", {
          domain: isProd ? "serenity.re" : undefined,
        });
        return { success: true };
      },
    });

    t.field("addUserToLicense", {
      type: "AddUserToLicenseResult",
      nullable: true,
      args: {
        input: arg({
          type: "AddUserToLicenseInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const { billingAccount } = await getBillingAccountByAuthToken(
          ctx.billingAccountAuthToken
        );
        const license = await prisma.license.findUnique({
          where: { id: args.input.licenseId },
        });
        if (!license || license.billingAccountId !== billingAccount.id) {
          throw new Error("Authorization failed");
        }
        const user = await prisma.user.findUnique({
          where: { id: args.input.userId },
        });
        if (!user) {
          throw new Error("User not found");
        }
        const updatedLicense = await prisma.license.update({
          where: { id: args.input.licenseId },
          data: { user: { connect: { id: user.id } } },
        });
        return { license: updatedLicense };
      },
    });

    t.field("refreshLicenseTokenAndRemoveUser", {
      type: "RefreshLicenseTokenAndRemoveUserResult",
      nullable: true,
      args: {
        input: arg({
          type: "RefreshLicenseTokenAndRemoveUserInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const { billingAccount } = await getBillingAccountByAuthToken(
          ctx.billingAccountAuthToken
        );
        const currentLicense = await prisma.license.findUnique({
          where: { id: args.input.licenseId },
        });
        if (
          !currentLicense ||
          currentLicense.billingAccountId !== billingAccount.id
        ) {
          throw new Error("Authorization failed");
        }
        let userInstructions = currentLicense.userId
          ? { user: { disconnect: true } }
          : {};
        const license = await prisma.license.update({
          where: { id: args.input.licenseId },
          data: { token: uuidv4(), ...userInstructions },
        });
        return { license };
      },
    });

    t.field("connectToLicense", {
      type: "ConnectToLicenseResult",
      nullable: true,
      args: {
        input: arg({
          type: "ConnectToLicenseInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const existingLicense = await prisma.license.findFirst({
          where: { token: args.input.licenseToken },
        });
        if (!existingLicense) {
          throw new Error("Authorization failed");
        }
        const license = await prisma.license.update({
          where: { id: existingLicense.id },
          data: { user: { connect: { id: sessionInfo.user.id } } },
        });
        return { licenseToken: license.token };
      },
    });

    t.field("disconnectFromLicense", {
      type: "DisconnectFromLicenseResult",
      nullable: true,
      args: {
        input: arg({
          type: "DisconnectFromLicenseInput",
          required: true,
        }),
      },
      async resolve(root, args, ctx) {
        const sessionInfo = await getDeviceAndUserByAuthMessage(
          // @ts-ignore
          ctx.signedUtcMessage
        );
        const existingLicense = await prisma.license.findFirst({
          where: {
            token: args.input.licenseToken,
            userId: sessionInfo.user.id,
          },
        });
        if (!existingLicense) {
          throw new Error("Authorization failed");
        }
        await prisma.license.update({
          where: { id: existingLicense.id },
          data: { user: { disconnect: true } },
        });
        return { success: true };
      },
    });
  },
});
