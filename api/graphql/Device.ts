import { objectType } from "nexus";
import { prisma } from "../../prisma/client";
import { getDeviceAndUserByAuthMessage } from "../utils";

export const Device = objectType({
  name: "Device",
  definition(t) {
    t.id("id");
    t.string("idKey");
    t.string("signingKey");
    t.string("userId");
    t.list.string("signatures");
    t.list.field("oneTimeKeys", {
      type: "OneTimeKey",
      nullable: true,
      async resolve(root, args, ctx) {
        const { device } =
          // @ts-ignore
          await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage);
        if (root.id !== device.id) return [];

        const oneTimeKeys = await prisma.oneTimeKey.findMany({
          where: {
            device: {
              id: device.id,
            },
          },
        });
        return oneTimeKeys;
      },
    });
  },
});
