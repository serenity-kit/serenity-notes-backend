import { objectType } from "nexus";

export const License = objectType({
  name: "License",
  definition(t) {
    t.id("id");
    t.string("token", { nullable: true });
    // should not be exposed to the user!
    // t.string("note", { nullable: true });
    t.string("userId", { nullable: true });
    t.string("createdAt", {
      resolve: (root) =>
        // @ts-ignore
        root.createdAt ? new Date(root.createdAt).toISOString() : null,
    });
  },
});
