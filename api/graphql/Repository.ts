import { objectType, stringArg } from "@nexus/schema";
import { getDeviceAndUserByAuthMessage } from "../utils";

export const Repository = objectType({
  name: "Repository",
  definition(t) {
    t.id("id");
    t.string("lastContentUpdateIntegrityId");
    // @ts-ignore
    t.boolean("isCreator", {
      // TODO proper ACL instead of inline queries
      async resolve(root, args, ctx) {
        // @ts-ignore
        if (!root.creatorId) {
          throw new Error("No creatorId on this repository.");
        }
        const currentUser = (
          await getDeviceAndUserByAuthMessage(ctx.signedUtcMessage)
        ).user;

        // @ts-ignore
        return currentUser.id && currentUser.id === root.creatorId;
      },
    });
    t.list.field("collaborators", { type: "User" });
    t.list.field("content", { type: "Content" });
  },
});
