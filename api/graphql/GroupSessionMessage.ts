import { objectType } from "@nexus/schema";

export const GroupSessionMessage = objectType({
  name: "GroupSessionMessage",
  definition(t) {
    t.id("id");
    t.int("type");
    t.string("body");
    t.string("targetDeviceIdKey");
  },
});
