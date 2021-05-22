export type PaddleSubscriptionPlanId =
  | "633265"
  | "633266"
  | "633267"
  | "633268";

export default function convertPaddleSubscriptionPlan(
  status: PaddleSubscriptionPlanId
) {
  switch (status) {
    case "633265": {
      return "PERSONAL_PRO";
    }
    case "633266": {
      return "PERSONAL_PRO";
    }
    case "633267": {
      return "TEAM";
    }
    case "633268": {
      return "TEAM";
    }
    default:
      throw new Error("Can't match Paddle subscription plan id.");
  }
}
