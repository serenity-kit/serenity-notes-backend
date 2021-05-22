import { prisma } from "../../prisma/client";
import { notEmpty } from "../utils/notEmpty";

type Params = {
  repositoryId: string;
  collaborators: { id?: string | null | undefined }[];
  deviceIdKey: string;
};

export async function getRepositoryContent({
  repositoryId,
  collaborators,
  deviceIdKey,
}: Params) {
  const deviceIds = collaborators.map((user) => user.id).filter(notEmpty);

  // all the devices of all the collaborates that could
  // have created an update
  const devices = await prisma.device.findMany({
    where: { user: { id: { in: deviceIds } } },
  });

  const contentRequests = devices.map(async (device) => {
    const contentArray = await prisma.content.findMany({
      where: {
        repository: { id: repositoryId },
        AND: { device: { id: device.id } },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
      include: {
        // only retrieve the groupSessionMessage only for the targetDevice
        groupSessionMessages: {
          where: {
            targetDeviceIdKey: deviceIdKey,
          },
        },
      },
    });
    if (contentArray.length > 0) {
      return {
        content: contentArray[0],
        authorUserId: device.userId,
        authorDevice: device,
      };
    }
    return null;
  });
  const contentWithAuthorUserIdResults = await Promise.all(contentRequests);

  return (
    contentWithAuthorUserIdResults
      .filter(notEmpty)
      // filter out the contentResults entries that don't have a groupSessionMessage
      // since the device won't be able to decrypt it and fail
      .filter((entry) => {
        const hasOneGroupSessionMessage =
          entry.content.groupSessionMessages.length > 0;
        if (!hasOneGroupSessionMessage) {
          console.error("Content entry is missing a groupSessionMessage.");
        }
        return hasOneGroupSessionMessage;
      })
      .map((entry) => {
        return {
          ...entry.content,
          authorUserId: entry.authorUserId,
          authorDevice: entry.authorDevice,
          groupSessionMessage: entry.content.groupSessionMessages[0],
        };
      })
  );
}

type AssertIsCollaboratorParams = {
  repositoryId: string;
  userId: string;
};

export async function assertIsCollaborator({
  repositoryId,
  userId,
}: AssertIsCollaboratorParams) {
  const repository = await prisma.repository.findMany({
    where: {
      id: repositoryId,
      collaborators: {
        some: { id: userId },
      },
    },
    take: 1,
  });

  if (repository.length === 0) {
    throw new Error("Can't find repository.");
  }
}
