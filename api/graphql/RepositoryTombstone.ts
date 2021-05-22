import { objectType } from "@nexus/schema";

export const RepositoryTombstone = objectType({
  name: "RepositoryTombstone",
  definition(t) {
    t.id("id");
  },
});
