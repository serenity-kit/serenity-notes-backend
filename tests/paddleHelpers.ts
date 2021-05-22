import crypto from "crypto";
import { URLSearchParams } from "url";
import { serialize } from "php-serialize";

type JsonObject = { [key: string]: any };

function ksort(obj: JsonObject) {
  const keys = Object.keys(obj).sort();
  let sortedObj: JsonObject = {};
  for (let index in keys) {
    sortedObj[keys[index]] = obj[keys[index]];
  }
  return sortedObj;
}

export function getPaddlePrivateKey() {
  // const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  //   modulusLength: 4096,
  //   publicKeyEncoding: {
  //     type: "spki",
  //     format: "pem",
  //   },
  //   privateKeyEncoding: {
  //     type: "pkcs8",
  //     format: "pem",
  //     cipher: "aes-256-cbc",
  //     passphrase: "mysecret",
  //   },
  // });

  const privateKey = `-----BEGIN ENCRYPTED PRIVATE KEY-----
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
-----END ENCRYPTED PRIVATE KEY-----`;
  return privateKey;
}

export const createSubscriptionData: { [key: string]: string } = {
  alert_id: "1359045059",
  alert_name: "subscription_created",
  cancel_url:
    "https://checkout.paddle.com/subscription/cancel?user=5&subscription=5&hash=533b5dd0fd196f0ac52bbcc4d41733f072cd75bf",
  checkout_id: "8-8ec7b4d2b0eae9b-6c547b8ae7",
  currency: "EUR",
  email: "ada@example.com",
  event_time: "2020-10-11 07:12:53",
  linked_subscriptions: "6, 9, 3",
  marketing_consent: "1",
  next_bill_date: "2020-10-12",
  passthrough: "Example String",
  quantity: "4",
  source: "Import",
  status: "trialing",
  subscription_id: "8",
  subscription_plan_id: "633265",
  unit_price: "unit_price",
  update_url:
    "https://checkout.paddle.com/subscription/update?user=8&subscription=4&hash=ed3ff951690ba27a832adccf0ac2b369ed602031",
  user_id: "2",
};

export const updateSubscriptionData: { [key: string]: string } = {
  alert_id: "327911839",
  alert_name: "subscription_updated",
  cancel_url:
    "https://checkout.paddle.com/subscription/cancel?user=2&subscription=7&hash=2f227ae713b6becfa7d7f94edbb9ecc67981a693",
  checkout_id: "6-065a93eb0a3fea8-efa58562b4",
  currency: "GBP",
  email: "littel.leora@example.org",
  event_time: "2020-10-12 18:27:57",
  linked_subscriptions: "8, 7, 2",
  marketing_consent: "1",
  new_price: "new_price",
  new_quantity: "4",
  new_unit_price: "new_unit_price",
  next_bill_date: "2020-10-17",
  old_next_bill_date: "old_next_bill_date",
  old_price: "old_price",
  old_quantity: "old_quantity",
  old_status: "old_status",
  old_subscription_plan_id: "old_subscription_plan_id",
  old_unit_price: "old_unit_price",
  passthrough: "Example String",
  status: "trialing",
  subscription_id: "8",
  subscription_plan_id: "633265",
  update_url:
    "https://checkout.paddle.com/subscription/update?user=6&subscription=5&hash=52c0c463586fd4eb7300ec87ce18dcd27a62cf52",
  user_id: "9",
};

export const cancelSubscriptionData: { [key: string]: string } = {
  alert_id: "441139168",
  alert_name: "subscription_cancelled",
  cancellation_effective_date: "2020-10-17 15:53:03",
  checkout_id: "3-4352df745357c14-729f2d69d1",
  currency: "EUR",
  email: "lavern48@example.com",
  event_time: "2020-10-11 20:16:47",
  linked_subscriptions: "6, 2, 9",
  marketing_consent: "1",
  passthrough: "Example String",
  quantity: "70",
  status: "deleted",
  subscription_id: "8",
  subscription_plan_id: "633265",
  unit_price: "unit_price",
  user_id: "2",
};

export function createPaddleParams(data: { [key: string]: string }) {
  const params = new URLSearchParams();
  for (const key in data) {
    params.append(key, data[key]);
  }
  const serialized = serialize(ksort(data));
  const signature = crypto.sign("sha1", Buffer.from(serialized), {
    key: getPaddlePrivateKey(),
    passphrase: "mysecret",
  });
  params.append("p_signature", signature.toString("base64"));
  return params;
}
