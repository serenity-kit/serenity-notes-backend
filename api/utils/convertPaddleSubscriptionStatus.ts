export type PaddleSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "deleted";

export default function convertPaddleSubscriptionStatus(
  status: PaddleSubscriptionStatus
) {
  switch (status) {
    case "active": {
      return "ACTIVE";
    }
    case "trialing": {
      return "TRAILING";
    }
    case "past_due": {
      return "PAST_DUE";
    }
    case "paused": {
      return "PAUSED";
    }
    case "deleted": {
      return "DELETED";
    }
    default:
      throw new Error("Can't match Paddle subscription status.");
  }
}
