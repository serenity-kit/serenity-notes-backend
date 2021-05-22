import { spawn } from "child_process";
import { GraphQLClient } from "graphql-request";
import {
  getDeviceA,
  generateKeys,
  generateOneTimeKeys,
  getUser1SigningKey,
  signDeviceUser1,
  createAuthenticationTokenDeviceA,
  nexusStartupSleep,
  nexusTeardownSleep,
} from "./helpers";
import {
  logContentTable,
  logGroupSessionMessageTable,
  logOneTimeKeyTable,
  logDeviceTable,
} from "./debugHelpers";
import Olm from "olm";
jest.setTimeout(25000);

let server: any;
let clientA = new GraphQLClient("http://localhost:4000/graphql");
let deviceA: any = null;
let deviceAKeys: any = null;
let createUserA: any = null;

const claimOneTimeKeysForMultipleDevicesMutationString = `
  mutation claimOneTimeKeysForMultipleDevices($input: ClaimOneTimeKeysForMultipleDevicesInput!) {
    claimOneTimeKeysForMultipleDevices(input: $input) {
      oneTimeKeysWithDeviceIdKey {
        oneTimeKey {
          key
          signature
        }
        deviceIdKey
      }
    }
  }
`;

const unclaimedOneTimeKeysCountString = `
  query unclaimedOneTimeKeysCount {
    unclaimedOneTimeKeysCount
  }
`;

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

it("create a user A", async () => {
  deviceA = getDeviceA();
  deviceAKeys = generateKeys(deviceA, 2);
  createUserA = await clientA.request(
    ` mutation createUser($input: CreateUserInput!) {
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

  clientA = new GraphQLClient("http://localhost:4000/graphql", {
    headers: {
      authorization: `signed-utc-msg ${createAuthenticationTokenDeviceA()}`,
    },
  });
});

it("verify unclaimedOneTimeKeysCount from device A", async () => {
  const unclaimedOneTimeKeysResult: any = await clientA.request(
    unclaimedOneTimeKeysCountString
  );
  expect(unclaimedOneTimeKeysResult.unclaimedOneTimeKeysCount).toBe(2);
});

it("claim oneTimeKeys (incl the fallbackKey) from device A", async () => {
  const claimOneTimeKeyMutation: any = await clientA.request(
    claimOneTimeKeysForMultipleDevicesMutationString,
    { input: { deviceIdKeys: [deviceAKeys.idKey] } }
  );

  expect(deviceAKeys.oneTimeKeys).toEqual(
    expect.arrayContaining([
      claimOneTimeKeyMutation.claimOneTimeKeysForMultipleDevices
        .oneTimeKeysWithDeviceIdKey[0].oneTimeKey,
    ])
  );
  expect(
    claimOneTimeKeyMutation.claimOneTimeKeysForMultipleDevices
      .oneTimeKeysWithDeviceIdKey[0].deviceIdKey
  ).toBe(deviceAKeys.idKey);

  const claimOneTimeKeyMutation2: any = await clientA.request(
    claimOneTimeKeysForMultipleDevicesMutationString,
    { input: { deviceIdKeys: [deviceAKeys.idKey] } }
  );
  expect(deviceAKeys.oneTimeKeys).toEqual(
    expect.arrayContaining([
      claimOneTimeKeyMutation2.claimOneTimeKeysForMultipleDevices
        .oneTimeKeysWithDeviceIdKey[0].oneTimeKey,
    ])
  );
  expect(
    claimOneTimeKeyMutation2.claimOneTimeKeysForMultipleDevices
      .oneTimeKeysWithDeviceIdKey[0].deviceIdKey
  ).toBe(deviceAKeys.idKey);
  expect(
    claimOneTimeKeyMutation.claimOneTimeKeysForMultipleDevices
      .oneTimeKeysWithDeviceIdKey[0].oneTimeKey.key
  ).not.toBe(
    claimOneTimeKeyMutation2.claimOneTimeKeysForMultipleDevices
      .oneTimeKeysWithDeviceIdKey[0].oneTimeKey.key
  );

  const claimOneTimeKeyMutation3: any = await clientA.request(
    claimOneTimeKeysForMultipleDevicesMutationString,
    { input: { deviceIdKeys: [deviceAKeys.idKey] } }
  );
  expect(
    claimOneTimeKeyMutation3.claimOneTimeKeysForMultipleDevices
      .oneTimeKeysWithDeviceIdKey
  ).toStrictEqual([
    {
      deviceIdKey: deviceAKeys.idKey,
      oneTimeKey: {
        key: deviceAKeys.fallbackKey,
        signature: deviceAKeys.fallbackKeySignature,
      },
    },
  ]);

  const claimOneTimeKeyMutation4: any = await clientA.request(
    claimOneTimeKeysForMultipleDevicesMutationString,
    { input: { deviceIdKeys: [deviceAKeys.idKey] } }
  );
  expect(
    claimOneTimeKeyMutation4.claimOneTimeKeysForMultipleDevices
      .oneTimeKeysWithDeviceIdKey
  ).toStrictEqual([
    {
      deviceIdKey: deviceAKeys.idKey,
      oneTimeKey: {
        key: deviceAKeys.fallbackKey,
        signature: deviceAKeys.fallbackKeySignature,
      },
    },
  ]);
});

it("verify unclaimedOneTimeKeysCount from device A", async () => {
  const unclaimedOneTimeKeysResult: any = await clientA.request(
    unclaimedOneTimeKeysCountString
  );
  expect(unclaimedOneTimeKeysResult.unclaimedOneTimeKeysCount).toBe(0);
});

it("send oneTimeKeys from device A", async () => {
  const oneTimeKeys = generateOneTimeKeys(deviceA, 8);
  const createOneTimeKeys: any = await clientA.request(
    ` mutation sendOneTimeKeys($input: SendOneTimeKeysInput!) {
      sendOneTimeKeys(input: $input) {
        device {
          id
          oneTimeKeys {
            key
          }
        }
      }
    }`,
    {
      input: { oneTimeKeys },
    }
  );
  expect(createOneTimeKeys.sendOneTimeKeys.device.oneTimeKeys.length).toBe(10);
  deviceA.mark_keys_as_published();
});

it("verify unclaimedOneTimeKeysCount from device A", async () => {
  const unclaimedOneTimeKeysResult: any = await clientA.request(
    unclaimedOneTimeKeysCountString
  );
  expect(unclaimedOneTimeKeysResult.unclaimedOneTimeKeysCount).toBe(8);
});
