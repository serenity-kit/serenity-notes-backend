import { spawn } from "child_process";
import fetch from "node-fetch";
import { nexusStartupSleep, nexusTeardownSleep } from "./helpers";
import {
  createSubscriptionData,
  createPaddleParams,
  cancelSubscriptionData,
} from "./paddleHelpers";
import {
  logContentTable,
  logGroupSessionMessageTable,
  logOneTimeKeyTable,
} from "./debugHelpers";
import Olm from "olm";
jest.setTimeout(25000);

let server: any;

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

it("cancel subscription succeeds", async () => {
  const params = createPaddleParams(cancelSubscriptionData);
  const response = await fetch("http://localhost:4000/webhooks/paddle", {
    method: "POST",
    body: params,
  });

  expect(response.status).toBe(200);
});
