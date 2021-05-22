import { enumType } from "@nexus/schema";

export const SubscriptionPlan = enumType({
  name: "SubscriptionPlan",
  members: ["PERSONAL_PRO", "TEAM"],
});
