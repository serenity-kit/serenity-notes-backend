import { objectType } from "nexus";

export const PrivateInfoContent = objectType({
  name: "PrivateInfoContent",
  definition(t) {
    t.field("privateInfoGroupSessionMessage", {
      type: "PrivateInfoGroupSessionMessage",
      nullable: true,
    });
    t.string("encryptedContent");
    t.field("authorDevice", { type: "Device" });
  },
});
