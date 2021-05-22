import { objectType } from "@nexus/schema";

export const DeviceTombstone = objectType({
  name: "DeviceTombstone",
  definition(t) {
    t.id("id");
    t.string("idKey");
  },
});
