import { spawn } from "child_process";
import { GraphQLClient } from "graphql-request";
import * as Y from "yjs";
import {
  getDeviceA,
  getDeviceB,
  generateKeys,
  generateOneTimeKeys,
  toBase64,
  createGroupSession,
  createGroupSessionMessage,
  createRepositoryUpdate,
  createAddDeviceMessage,
  getUser1SigningKey,
  getUser1SigningPrivateKey,
  signDeviceUser1,
  encryptAes,
  decryptAes,
  generateVerificationCode,
  createAuthenticationTokenDeviceA,
  createAuthenticationTokenDeviceB,
  updateYDocWithPrivateInfoContentEntries,
  nexusStartupSleep,
  nexusTeardownSleep,
  claimOneTimeKey,
} from "./helpers";
import {
  logContentTable,
  logGroupSessionMessageTable,
  logOneTimeKeyTable,
  logContactTable,
  logRepositoriesTable,
  logRepositoryCollaboratorsTable,
  logRepositoryContactTable,
  logContactInvitationTable,
} from "./debugHelpers";
import Olm from "olm";
jest.setTimeout(25000);

let server: any;
let clientA = new GraphQLClient("http://localhost:4000/graphql");
let clientB = new GraphQLClient("http://localhost:4000/graphql");
let deviceA: any = null;
let deviceB: any = null;
let deviceAKeys: any = null;
let deviceBKeys: any = null;
let createUserA: any = null;

const privateInfoQueryString = `
query {
  privateInfo {
    privateInfoContent {
      encryptedContent
      privateInfoGroupSessionMessage {
        type
        body
        targetDeviceIdKey
      }
      authorDevice {
        idKey
        signingKey
        signatures
      }
    }
  }
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
  deviceAKeys = generateKeys(deviceA, 10);
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

it("send oneTimeKeys from device A", async () => {
  const oneTimeKeys = generateOneTimeKeys(deviceA, 20);
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
  expect(createOneTimeKeys.sendOneTimeKeys.device.oneTimeKeys.length).toBe(30);
  deviceA.mark_keys_as_published();
});

it("update private info for device A", async () => {
  const devicesResult: any = await clientA.request(
    `
      query devices {
        devices {
          id,
          idKey,
          signingKey,
          signatures
        }
      }`
  );

  const privateInfoGroupSession = createGroupSession();
  const privateInfoGroupSessionMessages = await Promise.all(
    devicesResult.devices.map(async (targetDevice: { idKey: string }) => {
      const oneTimeKeyWithDeviceIdKey = await claimOneTimeKey(
        clientA,
        targetDevice.idKey
      );

      return createGroupSessionMessage(
        privateInfoGroupSession.prevKeyMessage,
        deviceA,
        targetDevice.idKey,
        oneTimeKeyWithDeviceIdKey.oneTimeKey.key
      );
    })
  );

  const yPrivateInfoDoc = new Y.Doc();
  const yDevicesMock = new Y.XmlText();
  yDevicesMock.insert(0, "iPhone");
  yPrivateInfoDoc.getXmlFragment("devices").insert(1, [yDevicesMock]);
  const yState = Y.encodeStateAsUpdate(yPrivateInfoDoc);
  const yStateVector = toBase64(yState);
  const encryptedContent = createRepositoryUpdate(
    privateInfoGroupSession,
    deviceA,
    yStateVector
  );

  const updatePrivateInfoResult: any = await clientA.request(
    `mutation updatePrivateInfo($input: UpdatePrivateInfoInput!) {
        updatePrivateInfo(input: $input) {
          privateInfoContent {
            encryptedContent
          }
        }
      }`,
    {
      input: {
        encryptedContent,
        privateInfoGroupSessionMessages,
      },
    }
  );

  expect(
    updatePrivateInfoResult.updatePrivateInfo.privateInfoContent
      .encryptedContent
  ).toBe(encryptedContent);
});

it("add new device B to my account (without updating the privateInfo)", async () => {
  // Device B part
  deviceB = getDeviceB();
  deviceBKeys = generateKeys(deviceB, 1);
  const verificationCode = generateVerificationCode();
  const secretDeviceB = "6c0a5434"; // generated for every addition
  const messageToTransfer = encryptAes(
    JSON.stringify({
      deviceKeys: deviceBKeys,
      secret: secretDeviceB,
    }),
    verificationCode
  );
  deviceB.mark_keys_as_published();

  // Device A part
  // Client A: add deviceB as verified device
  const transferredData = JSON.parse(
    decryptAes(messageToTransfer, verificationCode)
  );
  const secretDeviceA = "7423";
  const serverSecret = "abc";
  const verificationMessage = createAddDeviceMessage(
    deviceA,
    transferredData.deviceKeys.idKey,
    transferredData.deviceKeys.oneTimeKeys[0].key,
    `${
      transferredData.secret
    } ${secretDeviceA} ${getUser1SigningPrivateKey()} ${
      createUserA.createUser.user.id
    }`
  );

  const addDeviceMutationResult: any = await clientA.request(
    ` mutation addDevice($input: AddDeviceInput!) {
      addDevice(input: $input) {
        success
      }
    }`,
    {
      input: {
        device: {
          idKey: transferredData.deviceKeys.idKey,
          oneTimeKeys: transferredData.deviceKeys.oneTimeKeys,
          signingKey: transferredData.deviceKeys.signingKey,
          signature: signDeviceUser1(transferredData.deviceKeys),
          fallbackKey: deviceBKeys.fallbackKey,
          fallbackKeySignature: deviceBKeys.fallbackKeySignature,
        },
        verificationMessage: JSON.stringify(verificationMessage),
        serverSecret,
      },
    }
  );
  expect(addDeviceMutationResult.addDevice.success).toBe(true);

  // Device B part
  const addDeviceVerification: any = await clientB.request(
    `query fetchAddDeviceVerification($deviceIdKey: String!, $serverSecret: String!) {
      fetchAddDeviceVerification(deviceIdKey: $deviceIdKey, serverSecret: $serverSecret) {
        verificationMessage
      }
    }`,
    {
      deviceIdKey: deviceBKeys.idKey,
      serverSecret,
    }
  );

  const session = new Olm.Session();
  const encryptedMsg = JSON.parse(
    addDeviceVerification.fetchAddDeviceVerification.verificationMessage
  );
  session.create_inbound(deviceB, encryptedMsg.body);
  const decryptedVerificationMsg = session.decrypt(
    encryptedMsg.type,
    encryptedMsg.body
  );
  deviceB.remove_one_time_keys(session);

  // Device B: verify the secrets
  const secrets = decryptedVerificationMsg.split(" ");
  expect(secrets[0]).toBe(secretDeviceB);
  expect(secrets[1]).toBe(secretDeviceA);
  expect(secrets[2]).toBe(getUser1SigningPrivateKey());
  expect(secrets[3]).toBe(createUserA.createUser.user.id);

  clientB = new GraphQLClient("http://localhost:4000/graphql", {
    headers: {
      authorization: `signed-utc-msg ${createAuthenticationTokenDeviceB()}`,
    },
  });
  // Device B if valid send oneTimeKeys
  const oneTimeKeys = generateOneTimeKeys(deviceB, 20);
  const createOneTimeKeys: any = await clientB.request(
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
  expect(createOneTimeKeys.sendOneTimeKeys.device.oneTimeKeys.length).toBe(20);
  deviceB.mark_keys_as_published();
});

it("fetch privateInfo from device B", async () => {
  const privateInfoResult: any = await clientB.request(
    privateInfoQueryString,
    {}
  );

  expect(privateInfoResult.privateInfo.privateInfoContent.length).toBe(0);
});

it("update private info for device A and B", async () => {
  const devicesResult: any = await clientA.request(
    `
        query devices {
          devices {
            id,
            idKey,
            signingKey,
            signatures
          }
        }`
  );

  const privateInfoGroupSession = createGroupSession();
  const privateInfoGroupSessionMessages = await Promise.all(
    devicesResult.devices.map(async (targetDevice: { idKey: string }) => {
      const oneTimeKeyWithDeviceIdKey = await claimOneTimeKey(
        clientA,
        targetDevice.idKey
      );

      return createGroupSessionMessage(
        privateInfoGroupSession.prevKeyMessage,
        deviceA,
        targetDevice.idKey,
        oneTimeKeyWithDeviceIdKey.oneTimeKey.key
      );
    })
  );

  const yPrivateInfoDoc = new Y.Doc();
  const yDevicesMock = new Y.XmlText();
  yDevicesMock.insert(0, "iPhone");
  yPrivateInfoDoc.getXmlFragment("devices").insert(1, [yDevicesMock]);
  const yState = Y.encodeStateAsUpdate(yPrivateInfoDoc);
  const yStateVector = toBase64(yState);
  const encryptedContent = createRepositoryUpdate(
    privateInfoGroupSession,
    deviceA,
    yStateVector
  );

  const updatePrivateInfoResult: any = await clientA.request(
    `mutation updatePrivateInfo($input: UpdatePrivateInfoInput!) {
          updatePrivateInfo(input: $input) {
            privateInfoContent {
              encryptedContent
            }
          }
        }`,
    {
      input: {
        encryptedContent,
        privateInfoGroupSessionMessages,
      },
    }
  );

  expect(
    updatePrivateInfoResult.updatePrivateInfo.privateInfoContent
      .encryptedContent
  ).toBe(encryptedContent);
});

it("fetch privateInfo from device B", async () => {
  const privateInfoResult: any = await clientB.request(
    privateInfoQueryString,
    {}
  );

  expect(privateInfoResult.privateInfo.privateInfoContent.length).toBe(1);

  const yDoc = new Y.Doc();
  updateYDocWithPrivateInfoContentEntries(
    yDoc,
    deviceB,
    privateInfoResult.privateInfo.privateInfoContent
  );
  expect(yDoc.getXmlFragment("devices").toString()).toBe("iPhone");
});
