import { objectType } from "nexus";

export const OneTimeKey = objectType({
  name: "OneTimeKey",
  definition(t) {
    t.string("key");
    t.string("signature");
  },
});
