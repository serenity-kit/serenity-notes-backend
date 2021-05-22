import { objectType } from "@nexus/schema";

export const PrivateInfoGroupSessionMessage = objectType({
  name: "PrivateInfoGroupSessionMessage",
  definition(t) {
    t.id("id");
    t.int("type");
    t.string("body");
    t.string("targetDeviceIdKey");
  },
});
