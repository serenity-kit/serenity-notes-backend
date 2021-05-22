import { objectType } from "@nexus/schema";

export const Contact = objectType({
  name: "Contact",
  definition(t) {
    t.id("id");
    t.string("signingKey", { nullable: true });
    t.string("contactSigningKey", { nullable: true });
    t.list.string("signatures", { nullable: true });
    t.id("contactUserId", { nullable: true });
  },
});
