import { unionType } from "nexus";

export const RepositoryResult = unionType({
  name: "RepositoryResult",
  resolveType(item) {
    // @ts-ignore
    const typename = item.creatorId ? "Repository" : "RepositoryTombstone";
    if (!typename) {
      throw new Error(
        `Could not resolve the type of data passed to union type "RepositoryResult"`
      );
    }
    return typename;
  },
  definition(t) {
    t.members("Repository", "RepositoryTombstone");
  },
});
