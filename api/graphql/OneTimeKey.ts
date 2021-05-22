import { objectType } from "@nexus/schema";

export const OneTimeKey = objectType({
  name: "OneTimeKey",
  definition(t) {
    t.string("key");
    t.string("signature");
  },
});
