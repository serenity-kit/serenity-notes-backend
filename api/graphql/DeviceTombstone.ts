import { objectType } from "nexus";

export const DeviceTombstone = objectType({
  name: "DeviceTombstone",
  definition(t) {
    t.id("id");
    t.string("idKey");
  },
});
