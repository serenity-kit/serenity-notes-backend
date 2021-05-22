import { objectType } from "@nexus/schema";

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
