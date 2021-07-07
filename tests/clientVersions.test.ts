import { spawn } from "child_process";
import { GraphQLClient } from "graphql-request";
import { nexusStartupSleep, nexusTeardownSleep } from "./helpers";
import Olm from "olm";
jest.setTimeout(25000);

let server: any;
let clientA = new GraphQLClient("http://localhost:4000/graphql");

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

it("query latest mac client version", async () => {
  const result = <any>await clientA.request(`{ latestMacClientVersion }`);

  expect(result.latestMacClientVersion).toBeDefined();
});
