import { prisma } from "../../prisma/client";
import { SignedUtcMessage } from "../types";

export const getDeviceAndUserByAuthMessage = async (
  signedUtcMessage: SignedUtcMessage
) => {
  if (!signedUtcMessage || !signedUtcMessage.signingKey) {
    throw new Error("Authentication failed");
  }
  const device = await prisma.device.findUnique({
    where: { signingKey: signedUtcMessage.signingKey },
    include: {
      user: true,
    },
  });
  if (device)
    return {
      user: device.user,
      device,
    };
  throw new Error("Authentication failed");
};

export const sleep = async (milliseconds = 2000) =>
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
