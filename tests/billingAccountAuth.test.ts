(global as any).fetch = require("fetch-cookie/node-fetch")(
  require("node-fetch")
);

import { spawn } from "child_process";
import { GraphQLClient } from "graphql-request";
import fetch from "node-fetch";
import { nexusStartupSleep, nexusTeardownSleep } from "./helpers";
import { createSubscriptionData, createPaddleParams } from "./paddleHelpers";
import { updateBillingAccountEmailToken } from "./debugHelpers";
import Olm from "olm";
jest.setTimeout(25000);

let server: any;
let client = new GraphQLClient("http://localhost:4000/graphql");

beforeAll(async () => {
  server = spawn("yarn", ["dev:test"], { stdio: "inherit", detached: true });
  await Olm.init();
  await nexusStartupSleep();
});

afterAll(async () => {
  // see https://azimi.me/2014/12/31/kill-child_process-node-js.html
  process.kill(-server.pid);
  await nexusTeardownSleep();
});

it("create subscription succeeds", async () => {
  const params = createPaddleParams(createSubscriptionData);
  const response = await fetch("http://localhost:4000/webhooks/paddle", {
    method: "POST",
    body: params,
  });

  expect(response.status).toBe(200);
});

it("send email token", async () => {
  const sendBillingAccountAuthEmailResult: any = await client.request(
    `mutation sendBillingAccountAuthEmail($input: SendBillingAccountAuthEmailInput!) {
      sendBillingAccountAuthEmail(input: $input) {
        success
      }
    }`,
    { input: { email: "ada@example.com" } }
  );

  expect(
    sendBillingAccountAuthEmailResult.sendBillingAccountAuthEmail.success
  ).toBe(true);
});

it("authenticate BillingAccount", async () => {
  const rawToken = "abcdefg";
  // TODO would be better to intercept the api request to sendGrid
  // here we overwrite the token instead
  await updateBillingAccountEmailToken(rawToken);

  const authenticateBillingAccountResult: any = await client.request(
    `mutation authenticateBillingAccount($input: AuthenticateBillingAccountInput!) {
      authenticateBillingAccount(input: $input) {
        success
      }
    }`,
    { input: { emailToken: rawToken } }
  );

  expect(
    authenticateBillingAccountResult.authenticateBillingAccount.success
  ).toBe(true);
});

it("logout BillingAccount", async () => {
  const logoutBillingAccountResult: any = await client.request(
    `mutation logoutBillingAccount {
      logoutBillingAccount {
        success
      }
    }`
  );

  expect(logoutBillingAccountResult.logoutBillingAccount.success).toBe(true);
});
