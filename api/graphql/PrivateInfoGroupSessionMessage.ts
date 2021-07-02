import { objectType } from "nexus";

export const PrivateInfoGroupSessionMessage = objectType({
  name: "PrivateInfoGroupSessionMessage",
  definition(t) {
    t.id("id");
    t.int("type");
    t.string("body");
    t.string("targetDeviceIdKey");
  },
});
