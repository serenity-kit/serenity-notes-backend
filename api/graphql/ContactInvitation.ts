import { objectType } from "nexus";

export const ContactInvitation = objectType({
  name: "ContactInvitation",
  definition(t) {
    t.id("id");
    t.id("acceptedByUserId", { nullable: true });
    t.string("status", { nullable: true });
    t.string("contactInfoMessage", { nullable: true });
  },
});
