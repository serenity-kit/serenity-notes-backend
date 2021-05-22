import { objectType } from "@nexus/schema";

export const OneTimeKeyWithDeviceIdKey = objectType({
  name: "OneTimeKeyWithDeviceIdKey",
  definition(t) {
    t.field("oneTimeKey", {
      type: "OneTimeKey",
      nullable: true,
    });
    t.string("deviceIdKey", { nullable: true });
  },
});
