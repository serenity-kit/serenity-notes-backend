(global as any).fetch = require("fetch-cookie/node-fetch")(
  require("node-fetch")
);

import { spawn } from "child_process";
import { GraphQLClient } from "graphql-request";
import fetch from "node-fetch";
import {
  nexusStartupSleep,
  nexusTeardownSleep,
  createAuthenticationTokenDeviceA,
  signDeviceUser1,
  getDeviceA,
  generateKeys,
  getUser1SigningKey,
} from "./helpers";
import { createSubscriptionData, createPaddleParams } from "./paddleHelpers";
import { updateBillingAccountEmailToken } from "./debugHelpers";
import Olm from "olm";
jest.setTimeout(25000);

let server: any;
let client = new GraphQLClient("http://localhost:4000/graphql");
let user1ClientA = new GraphQLClient("http://localhost:4000/graphql");
let user1Id = "";
let licenses: any[] = [];

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

it("fetch billingAccount and licenses", async () => {
  const billingAccountResult: any = await client.request(
    `query billingAccount {
      billingAccount {
        id
        email
        allLicenses {
          id
          token
          userId
        }
      }
    }`
  );

  expect(billingAccountResult.billingAccount.email).toBe("ada@example.com");
  expect(billingAccountResult.billingAccount.id).toBeDefined();
  expect(billingAccountResult.billingAccount.allLicenses.length).toBe(4);
  licenses = billingAccountResult.billingAccount.allLicenses;
});

it("create a user A", async () => {
  const deviceA = getDeviceA();
  const deviceAKeys = generateKeys(deviceA, 10);
  const createUserA: any = await user1ClientA.request(
    `mutation createUser($input: CreateUserInput!) {
      createUser(input: $input) {
        user {
          id
          devices {
            idKey
          }
        }
      }
    }`,
    {
      input: {
        device: {
          idKey: deviceAKeys.idKey,
          oneTimeKeys: deviceAKeys.oneTimeKeys,
          signingKey: deviceAKeys.signingKey,
          signature: signDeviceUser1(deviceAKeys),
          fallbackKey: deviceAKeys.fallbackKey,
          fallbackKeySignature: deviceAKeys.fallbackKeySignature,
        },
        signingKey: getUser1SigningKey(),
      },
    }
  );
  deviceA.mark_keys_as_published();

  expect(createUserA.createUser.user.id).toBeDefined();
  expect(createUserA.createUser.user.devices[0].idKey).toBe(deviceAKeys.idKey);

  user1ClientA = new GraphQLClient("http://localhost:4000/graphql", {
    headers: {
      authorization: `signed-utc-msg ${createAuthenticationTokenDeviceA()}`,
    },
  });
  user1Id = createUserA.createUser.user.id;
});

it("add User To License", async () => {
  const addUserToLicenseResult: any = await client.request(
    `mutation addUserToLicense($input: AddUserToLicenseInput!) {
      addUserToLicense(input: $input) {
        license {
          userId
        }
      }
    }`,
    { input: { licenseId: licenses[0].id, userId: user1Id } }
  );

  expect(addUserToLicenseResult.addUserToLicense.license.userId).toBeDefined();
});

it("refresh license token and removeUser", async () => {
  const refreshLicenseTokenAndRemoveUserResult: any = await client.request(
    `mutation refreshLicenseTokenAndRemoveUser($input: RefreshLicenseTokenAndRemoveUserInput!) {
      refreshLicenseTokenAndRemoveUser(input: $input) {
        license {
          id
          token
          userId
        }
      }
    }`,
    { input: { licenseId: licenses[0].id } }
  );

  expect(
    refreshLicenseTokenAndRemoveUserResult.refreshLicenseTokenAndRemoveUser
      .license.id
  ).toBe(licenses[0].id);
  expect(
    refreshLicenseTokenAndRemoveUserResult.refreshLicenseTokenAndRemoveUser
      .license.token
  ).not.toBe(licenses[0].token);
  expect(
    refreshLicenseTokenAndRemoveUserResult.refreshLicenseTokenAndRemoveUser
      .license.userId
  ).toBe(null);
});

it("refresh license token with no user connected", async () => {
  const refreshLicenseTokenAndRemoveUserResult: any = await client.request(
    `mutation refreshLicenseTokenAndRemoveUser($input: RefreshLicenseTokenAndRemoveUserInput!) {
      refreshLicenseTokenAndRemoveUser(input: $input) {
        license {
          id
          token
          userId
        }
      }
    }`,
    { input: { licenseId: licenses[0].id } }
  );

  expect(
    refreshLicenseTokenAndRemoveUserResult.refreshLicenseTokenAndRemoveUser
      .license.id
  ).toBe(licenses[0].id);
  expect(
    refreshLicenseTokenAndRemoveUserResult.refreshLicenseTokenAndRemoveUser
      .license.token
  ).not.toBe(licenses[0].token);
  expect(
    refreshLicenseTokenAndRemoveUserResult.refreshLicenseTokenAndRemoveUser
      .license.userId
  ).toBe(null);
});

it("retrieve licenses", async () => {
  const allLicenseTokensResult: any = await user1ClientA.request(
    `query allLicenseTokens {
      allLicenseTokens {
        token
        isActive
        subscriptionPlan
      }
    }`
  );

  expect(allLicenseTokensResult.allLicenseTokens).toStrictEqual([]);
});

it("connect to license in the app", async () => {
  const conntectToLicenseResult: any = await user1ClientA.request(
    `mutation connectToLicense($input: ConnectToLicenseInput!) {
      connectToLicense(input: $input) {
        licenseToken
      }
    }`,
    { input: { licenseToken: licenses[1].token } }
  );

  expect(conntectToLicenseResult.connectToLicense.licenseToken).toBe(
    licenses[1].token
  );
});

it("retrieve licenses", async () => {
  const allLicenseTokensResult: any = await user1ClientA.request(
    `query allLicenseTokens {
      allLicenseTokens {
        token
        isActive
        subscriptionPlan
      }
    }`
  );

  expect(allLicenseTokensResult.allLicenseTokens[0].token).toBe(
    licenses[1].token
  );
  expect(allLicenseTokensResult.allLicenseTokens[0].isActive).toBe(true);
  expect(allLicenseTokensResult.allLicenseTokens[0].subscriptionPlan).toBe(
    "PERSONAL_PRO"
  );
});

it("disconnect from license in the app", async () => {
  const disconntectFromLicenseResult: any = await user1ClientA.request(
    `mutation disconnectFromLicense($input: DisconnectFromLicenseInput!) {
      disconnectFromLicense(input: $input) {
        success
      }
    }`,
    { input: { licenseToken: licenses[1].token } }
  );

  expect(disconntectFromLicenseResult.disconnectFromLicense.success).toBe(true);
});

it("retrieve licenses", async () => {
  const allLicenseTokensResult: any = await user1ClientA.request(
    `query allLicenseTokens {
      allLicenseTokens {
        token
        isActive
        subscriptionPlan
      }
    }`
  );

  expect(allLicenseTokensResult.allLicenseTokens).toStrictEqual([]);
});
