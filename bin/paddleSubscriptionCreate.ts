import fetch from "node-fetch";
import {
  createSubscriptionData,
  createPaddleParams,
} from "../tests/paddleHelpers";

async function run() {
  const params = createPaddleParams(createSubscriptionData);
  const response = await fetch("http://localhost:4000/webhooks/paddle", {
    method: "POST",
    body: params,
  });
  console.log(response);
}

run();
