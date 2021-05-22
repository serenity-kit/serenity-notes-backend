import { objectType } from "@nexus/schema";

export const PrivateInfo = objectType({
  name: "PrivateInfo",
  definition(t) {
    t.list.field("privateInfoContent", {
      type: "PrivateInfoContent",
      nullable: true,
    });
  },
});
