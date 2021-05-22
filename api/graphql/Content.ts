import { objectType } from "@nexus/schema";

export const Content = objectType({
  name: "Content",
  definition(t) {
    t.id("id");
    t.field("groupSessionMessage", {
      type: "GroupSessionMessage",
      nullable: true,
    });
    t.string("encryptedContent");
    t.string("createdAt", {
      resolve: (root) =>
        // @ts-ignore
        root.createdAt ? new Date(root.createdAt).toISOString() : null,
    });
    t.id("authorUserId");
    t.field("authorDevice", { type: "Device" });
  },
});
