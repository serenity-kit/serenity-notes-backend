import { objectType } from "nexus";

export const PrivateInfo = objectType({
  name: "PrivateInfo",
  definition(t) {
    t.list.field("privateInfoContent", {
      type: "PrivateInfoContent",
      nullable: true,
    });
  },
});
