import { prisma } from "../../prisma/client";
import { Device } from "@prisma/client";

type Params = {
  device: Device;
  userId: string;
};

export async function getDeleteDevicePromises({ device, userId }: Params) {
  const content = await prisma.content.findMany({
    where: { deviceId: device.id },
    select: { id: true },
  });
  const privateInfoContent = await prisma.privateInfoContent.findMany({
    where: { deviceId: device.id },
    select: { id: true },
  });

  const deleteGoupSessionMessagesPromise = prisma.groupSessionMessage.deleteMany(
    {
      where: {
        contentId: { in: content.map((contentEntry) => contentEntry.id) },
      },
    }
  );

  const privateInfoGroupSessionMessagesPromise = prisma.privateInfoGroupSessionMessage.deleteMany(
    {
      where: {
        privateInfoContentId: {
          in: privateInfoContent.map((contentEntry) => contentEntry.id),
        },
      },
    }
  );
  const deleteOneTimeKeyPromise = prisma.oneTimeKey.deleteMany({
    where: { deviceId: device.id },
  });
  const deletePrivateInfoContentPromise = prisma.privateInfoContent.deleteMany({
    where: { deviceId: device.id },
  });
  const deleteContentPromise = prisma.content.deleteMany({
    where: { deviceId: device.id },
  });
  const deleteDevicePromise = prisma.device.delete({
    where: { id: device.id },
  });
  const createDeviceTombstonePromise = prisma.deviceTombstone.create({
    data: {
      id: device.id,
      idKey: device.idKey,
      signingKey: device.signingKey,
      userId,
    },
  });

  return [
    deleteGoupSessionMessagesPromise,
    privateInfoGroupSessionMessagesPromise,
    deleteOneTimeKeyPromise,
    deletePrivateInfoContentPromise,
    deleteContentPromise,
    deleteDevicePromise,
    createDeviceTombstonePromise,
  ];
}
