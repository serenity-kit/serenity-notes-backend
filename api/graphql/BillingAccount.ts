import { objectType, enumType } from "@nexus/schema";

export const BillingAccountSuscriptionStatus = enumType({
  name: "BillingAccountSuscriptionStatus",
  members: ["ACTIVE", "INACTIVE"],
});

export const BillingAccount = objectType({
  name: "BillingAccount",
  definition(t) {
    t.id("id");
    t.string("email", { nullable: true });
    t.string("paddleUpdateUrl", { nullable: true });
    t.string("paddleCancelUrl", { nullable: true });
    // t.field("suscriptionStatus", {
    //   type: "BillingAccountSuscriptionStatus",
    //   nullable: true,
    //   resolve: (billingAccount) => {
    //     if (billingAccount.suscriptionStatus === "ACTIVE") return "ACTIVE";
    //     return "INACTIVE";
    //   },
    // });
    // t.string("cancellationEffectiveDate", { nullable: true });
    t.list.field("allLicenses", { type: "License", nullable: true });
  },
});
