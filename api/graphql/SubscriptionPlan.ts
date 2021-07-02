import { enumType } from "nexus";

export const SubscriptionPlan = enumType({
  name: "SubscriptionPlan",
  members: ["PERSONAL_PRO", "TEAM"],
});
