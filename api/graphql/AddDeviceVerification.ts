import { objectType } from "@nexus/schema";

export const AddDeviceVerification = objectType({
  name: "AddDeviceVerification",
  definition(t) {
    t.string("verificationMessage", { nullable: true });
  },
});
