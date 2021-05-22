import { objectType } from "@nexus/schema";

export const LicenseToken = objectType({
  name: "LicenseToken",
  definition(t) {
    t.string("token");
    t.boolean("isActive");
    t.field("subscriptionPlan", { type: "SubscriptionPlan" });
  },
});
