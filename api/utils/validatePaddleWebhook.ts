// code inspired by the official Paddle docs
// unit tests could be inspired by https://github.com/daveagill/verify-paddle-webhook/blob/master/index.test.js

import crypto from "crypto";
import { serialize } from "php-serialize";

type JsonObject = { [key: string]: any };

// public key from your paddle dashboard
const productionPublicKey = process.env.PADDLE_PUBLIC_KEY as string;

const testAndDevelopmentPublicKey = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAmNkD+Z03XXAJ9WYq0uKr
/FTKBmat74a9/7tTGv4gkKi/F/FQxdCLsdcsdKL40T4Ji8LYXWYuBV2HuiUSdTkd
V+mvzo770+c4HUxvYMfPkFtkj/OMHS5CSXMa2el8+xdeoU69TwjbByQFZlyoGDhq
KwHy+J3jspBclNFCyqmxM5HJD/ptSYO68Z9BU5oqPCD9u5agiKa0fVg0rHlP7GmL
XRBHJAxzZEGK1gatB0S0HmMuyNP2KAH51glKCCZb2/0X7UF2O2sm0Rtn6OiTq0qc
rmpBHbUEmf5NFX2OnBRaeE9GdvlpkhNMrGDUHTATMOTHYk0BODwgv7IiXdH4jBqZ
5IzDPGdG0mjcErp2NI0R7o8914W22rlnG9YjsuxiokHws6whd6v7hwrZ9q2LVzZX
+KvBdcPFnEKOQE9NMw1ey6IQKFrwX63YXvS7JTsvxLsE5VohJbn9C+LIet72QZu+
JezmTz0uNNR8C9Tio9ubpnwPj7TGMq4C45nfQ9uk/Q9MV+Q9suCN2G5Y+/dab/JB
idhWVsC1/2k9ww0+l24Jh5cj3PIieFZdr4FJCqv0AgkhsTAdUzDzI8cFgcZQ8cqg
HXSRUyB7y19iT0Yeo/pGSlsvHJrd9ARRiQVQ55/CP81vwQTPmSlSBrwde3/5ZcQV
xmAt43prwOmFeq/v/nObCJkCAwEAAQ==
-----END PUBLIC KEY-----`;

const publicKey =
  process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"
    ? testAndDevelopmentPublicKey
    : productionPublicKey;

if (publicKey === undefined) {
  throw new Error("PADDLE_PUBLIC_KEY must be set.");
}

function ksort(obj: JsonObject) {
  const keys = Object.keys(obj).sort();
  let sortedObj: JsonObject = {};
  for (let index in keys) {
    sortedObj[keys[index]] = obj[keys[index]];
  }
  return sortedObj;
}

export default function validatePaddleWebhook(jsonObject: JsonObject) {
  if (publicKey === undefined) {
    throw new Error("PADDLE_PUBLIC_KEY must be set.");
  }
  const mySig = Buffer.from(jsonObject.p_signature, "base64");

  // Remove p_signature from object since it is not included in array of fields used in verification
  delete jsonObject.p_signature;
  // Sort array by key in ascending order
  jsonObject = ksort(jsonObject);
  for (let property in jsonObject) {
    if (
      jsonObject.hasOwnProperty(property) &&
      typeof jsonObject[property] !== "string"
    ) {
      if (Array.isArray(jsonObject[property])) {
        // is it an array
        jsonObject[property] = jsonObject[property].toString();
      } else {
        //if its not an array and not a string, then it is a JSON obj
        jsonObject[property] = JSON.stringify(jsonObject[property]);
      }
    }
  }

  const serialized = serialize(jsonObject);

  // Verify the serialized array against the signature using SHA1 with your public key.
  const verifier = crypto.createVerify("sha1");
  verifier.update(serialized);
  verifier.end();

  return verifier.verify(publicKey, mySig);
}
