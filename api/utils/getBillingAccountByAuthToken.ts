import crypto from "crypto";
import { prisma } from "../../prisma/client";

export default async function getBillingAccountByAuthToken(authToken?: string) {
  if (!authToken) {
    throw new Error("Authentication failed");
  }
  const hashedToken = crypto
    .createHash("sha256")
    .update(authToken)
    .digest("base64");
  const billingAccountAuthToken = await prisma.billingAccountAuthToken.findUnique({
    where: { token: hashedToken },
    include: { billingAccount: true },
  });
  if (
    billingAccountAuthToken &&
    new Date() <= new Date(billingAccountAuthToken.expiration)
  ) {
    return {
      billingAccount: billingAccountAuthToken.billingAccount,
      billingAccountAuthToken,
    };
  }
  throw new Error("Authentication failed");
}
