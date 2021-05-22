import { objectType } from "@nexus/schema";
import { prisma } from "../../prisma/client";

export const User = objectType({
  name: "User",
  definition(t) {
    t.id("id");
    t.list.field("devices", {
      type: "Device",
      async resolve(root, args, ctx) {
        if (!root.id) return [];
        return await prisma.device.findMany({
          where: { user: { id: root.id } },
        });
      },
    });
  },
});
