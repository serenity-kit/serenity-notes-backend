import { objectType } from "nexus";

export const RepositoryTombstone = objectType({
  name: "RepositoryTombstone",
  definition(t) {
    t.id("id");
  },
});
