import { spawn } from "child_process";
import { GraphQLClient } from "graphql-request";
import * as Y from "yjs";
import {
  getDeviceA,
  getDeviceB,
  getDeviceC,
  getUser2DeviceA,
  generateKeys,
  generateOneTimeKeys,
  toBase64,
  fromBase64,
  createGroupSession,
  createGroupSessionMessage,
  createRepositoryUpdate,
  updateYDocWithContentEntries,
  createAddDeviceMessage,
  createContactInfoMessage,
  decryptContactInfoMessage,
  getUser1SigningKey,
  getUser1SigningPrivateKey,
  getUser2SigningKey,
  getUser2SigningPrivateKey,
  signDeviceUser1,
  signDeviceUser2,
  signContactUserKey,
  encryptAes,
  decryptAes,
  generateVerificationCode,
  createAuthenticationTokenDeviceA,
  createAuthenticationTokenDeviceB,
  createAuthenticationTokenDeviceC,
  createAuthenticationTokenUser2DeviceA,
  verifyDevice,
  verifyContact,
  verifySchemaVersion,
  generateSigningPrivateKey,
  updateYDocWithPrivateInfoContentEntries,
  nexusStartupSleep,
  nexusTeardownSleep,
  claimOneTimeKeysAndCreateGroupSessionMessages,
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
import { GroupSession } from "./types";
import Olm from "olm";
jest.setTimeout(25000);

let server: any;
let clientA = new GraphQLClient("http://localhost:4000/graphql");
let clientB = new GraphQLClient("http://localhost:4000/graphql");
let clientC = new GraphQLClient("http://localhost:4000/graphql");
let user2ClientA = new GraphQLClient("http://localhost:4000/graphql");
let deviceA: any = null;
let deviceB: any = null;
let deviceC: any = null;
let user2DeviceA: any = null;
let deviceAKeys: any = null;
let deviceBKeys: any = null;
let deviceCKeys: any = null;
let user1DeviceAInboundGroupSessions: any = {};
let user1DeviceBInboundGroupSessions: any = {};
let user1DeviceCInboundGroupSessions: any = {};
let user2DeviceAKeys: any = null;
let user2DeviceAInboundGroupSessions: any = {};
let yDocA: any = null;
let createUserA: any = null;
let createUser2: any = null;
let groupSessionA: GroupSession;
let groupSessionA2: GroupSession;
let groupSessionA3: GroupSession;
let createRepositoryMutation: any = null;

const repositoryQueryString = `
query repositoryQuery($id: ID!) {
  repository(id: $id) {
    __typename
    ... on Repository {
      id
      content {
        encryptedContent
        groupSessionMessage {
          id
          type
          body
          targetDeviceIdKey
        }
        createdAt
        authorUserId
        authorDevice {
          idKey
          signingKey
          signatures
        }
        schemaVersion
        schemaVersionSignature
      }
    }
    ... on RepositoryTombstone {
      id
    }
  }
}
`;

const repositoriesQueryString = `
query repositoriesQuery {
  allRepositories {
    __typename
    ... on Repository {
      id
      content {
        encryptedContent
        groupSessionMessage {
          id
          type
          body
          targetDeviceIdKey
        }
        createdAt
        authorUserId
        authorDevice {
          idKey
          signingKey
          signatures
        }
        schemaVersion
        schemaVersionSignature
      }
    }
    ... on RepositoryTombstone {
      id
    }
  }
}
`;

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

it("fetch privateInfo", async () => {
  const privateInfoResult: any = await clientA.request(
    privateInfoQueryString,
    {}
  );

  expect(privateInfoResult.privateInfo.privateInfoContent.length).toBe(0);
});

it("create a repository", async () => {
  yDocA = new Y.Doc();
  const yXmlText = new Y.XmlText();
  yXmlText.insert(0, "Hello World");
  yDocA.getXmlFragment("page").insert(0, [yXmlText]);
  const yStateA = Y.encodeStateAsUpdate(yDocA);
  const encodedYStateA = toBase64(yStateA);

  groupSessionA = createGroupSession();
  const groupSessionMessages =
    await claimOneTimeKeysAndCreateGroupSessionMessages(
      clientA,
      deviceA,
      createUserA.createUser.user.devices,
      groupSessionA
    );

  const encryptedContent = createRepositoryUpdate(
    groupSessionA,
    deviceA,
    encodedYStateA
  );

  createRepositoryMutation = await clientA.request(
    `
      mutation createRepositoryMutation($input: CreateRepositoryInput!) {
        createRepository(input: $input) {
          repository {
            id
            collaborators {
              id
              devices {
                idKey
              }
            }
            isCreator
          }
          groupSessionMessageIds
        }
      }
    `,
    {
      input: {
        content: {
          encryptedContent,
          groupSessionMessages,
          schemaVersion: 1,
          schemaVersionSignature: deviceA.sign("1"),
        },
      },
    }
  );

  expect(createRepositoryMutation.createRepository.repository.id).toBeDefined();
  expect(
    createRepositoryMutation.createRepository.repository.collaborators[0].id
  ).toBe(createUserA.createUser.user.id);
  expect(createRepositoryMutation.createRepository.repository.isCreator).toBe(
    true
  );
});

it("query the created repository", async () => {
  const repositoryQuery: any = await clientA.request(repositoryQueryString, {
    id: createRepositoryMutation.createRepository.repository.id,
    deviceIdKey: deviceAKeys.idKey,
  });

  expect(
    verifySchemaVersion(
      deviceAKeys.signingKey,
      repositoryQuery.repository.content[0].schemaVersion,
      repositoryQuery.repository.content[0].schemaVersionSignature
    )
  ).toBe(true);

  const yDocAA = new Y.Doc();
  user1DeviceAInboundGroupSessions = updateYDocWithContentEntries(
    yDocAA,
    deviceA,
    repositoryQuery.repository.content,
    user1DeviceAInboundGroupSessions
  );
  expect(yDocAA.getXmlFragment("page").toString()).toBe("Hello World");
});

it("update the repository", async () => {
  const yXmlText3 = new Y.XmlText();
  yXmlText3.insert(0, " and Solarsystem");
  yDocA.getXmlFragment("page").insert(1, [yXmlText3]);
  const yStateA3 = Y.encodeStateAsUpdate(yDocA);
  const yStateVectorA3 = toBase64(yStateA3);
  const encryptedContent3 = createRepositoryUpdate(
    groupSessionA,
    deviceA,
    yStateVectorA3
  );

  const updateRepositoryContentMutation: any = await clientA.request(
    `
      mutation updateRepositoryContentMutation($input: UpdateRepositoryContentInput!) {
        updateRepositoryContent(input: $input) {
          content {
            encryptedContent
          }
        }
      }
    `,
    {
      input: {
        repositoryId: createRepositoryMutation.createRepository.repository.id,
        encryptedContent: encryptedContent3,
        groupSessionMessageIds:
          createRepositoryMutation.createRepository.groupSessionMessageIds,
        schemaVersion: 1,
        schemaVersionSignature: deviceA.sign("1"),
      },
    }
  );

  expect(
    updateRepositoryContentMutation.updateRepositoryContent.content
  ).toBeDefined();
});

it("query the updated repository", async () => {
  const repositoryQuery2: any = await clientA.request(repositoryQueryString, {
    id: createRepositoryMutation.createRepository.repository.id,
    deviceIdKey: deviceAKeys.idKey,
  });

  expect(
    verifySchemaVersion(
      deviceAKeys.signingKey,
      repositoryQuery2.repository.content[0].schemaVersion,
      repositoryQuery2.repository.content[0].schemaVersionSignature
    )
  ).toBe(true);

  const yDocAAA = new Y.Doc();
  user1DeviceAInboundGroupSessions = updateYDocWithContentEntries(
    yDocAAA,
    deviceA,
    repositoryQuery2.repository.content,
    user1DeviceAInboundGroupSessions
  );
  expect(yDocAAA.getXmlFragment("page").toString()).toBe(
    "Hello World and Solarsystem"
  );
});

it("add new device B to my account", async () => {
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

  // Device A: then checks if it can encrypt the existing repositories for device B and does so
});

it("update the repository from device A for device A & B", async () => {
  const groupSession = createGroupSession();
  const groupSessionMessages =
    await claimOneTimeKeysAndCreateGroupSessionMessages(
      clientA,
      deviceA,
      [{ idKey: deviceAKeys.idKey }, { idKey: deviceBKeys.idKey }],
      groupSession
    );

  const yState = Y.encodeStateAsUpdate(yDocA);
  const yStateVector = toBase64(yState);
  const encryptedContent = createRepositoryUpdate(
    groupSession,
    deviceA,
    yStateVector
  );

  const updateRepositoryContentAndGroupSessionMutation: any =
    await clientA.request(
      `
      mutation updateRepositoryContentAndGroupSessionMutation($input: UpdateRepositoryContentAndGroupSessionInput!) {
        updateRepositoryContentAndGroupSession(input: $input) {
          content {
            encryptedContent
          }
        }
      }
    `,
      {
        input: {
          repositoryId: createRepositoryMutation.createRepository.repository.id,
          encryptedContent: encryptedContent,
          groupSessionMessages,
          schemaVersion: 1,
          schemaVersionSignature: deviceA.sign("1"),
        },
      }
    );

  expect(
    updateRepositoryContentAndGroupSessionMutation
      .updateRepositoryContentAndGroupSession.content
  ).toBeDefined();
});

it("query the existing repository from deviceB", async () => {
  // TODO retrieve all repositories

  const repositoryQuery: any = await clientB.request(repositoryQueryString, {
    id: createRepositoryMutation.createRepository.repository.id,
    deviceIdKey: deviceBKeys.idKey,
  });
  const yDocB = new Y.Doc();
  user1DeviceBInboundGroupSessions = updateYDocWithContentEntries(
    yDocB,
    deviceB,
    repositoryQuery.repository.content,
    user1DeviceBInboundGroupSessions
  );
  expect(yDocB.getXmlFragment("page").toString()).toBe(
    "Hello World and Solarsystem"
  );
});

it("add a third device C to my account", async () => {
  // Device C part
  deviceC = getDeviceC();
  deviceCKeys = generateKeys(deviceC, 1);
  const secretDeviceC = "4a258779";
  const verificationCode = generateVerificationCode();
  const messageToTransfer = encryptAes(
    JSON.stringify({
      deviceKeys: deviceCKeys,
      secret: secretDeviceC,
    }),
    verificationCode
  );
  deviceC.mark_keys_as_published();

  // Device A part
  // Client A: add deviceC as verified device
  const transferredData = JSON.parse(
    decryptAes(messageToTransfer, verificationCode)
  );
  const secretDeviceA = "6592";
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
          fallbackKey: deviceCKeys.fallbackKey,
          fallbackKeySignature: deviceCKeys.fallbackKeySignature,
        },
        verificationMessage: JSON.stringify(verificationMessage),
        serverSecret,
      },
    }
  );
  expect(addDeviceMutationResult.addDevice.success).toBe(true);

  // Device C part
  const addDeviceVerification: any = await clientC.request(
    `query fetchAddDeviceVerification($deviceIdKey: String!, $serverSecret: String!) {
      fetchAddDeviceVerification(deviceIdKey: $deviceIdKey, serverSecret: $serverSecret) {
        verificationMessage
      }
    }`,
    {
      deviceIdKey: deviceCKeys.idKey,
      serverSecret,
    }
  );

  const session = new Olm.Session();
  const encryptedMsg = JSON.parse(
    addDeviceVerification.fetchAddDeviceVerification.verificationMessage
  );
  session.create_inbound(deviceC, encryptedMsg.body);
  const decryptedVerificationMsg = session.decrypt(
    encryptedMsg.type,
    encryptedMsg.body
  );
  deviceC.remove_one_time_keys(session);

  // Client C: verify the secrets
  const secrets = decryptedVerificationMsg.split(" ");
  expect(secrets[0]).toBe(secretDeviceC);
  expect(secrets[1]).toBe(secretDeviceA);
  expect(secrets[2]).toBe(getUser1SigningPrivateKey());
  expect(secrets[3]).toBe(createUserA.createUser.user.id);

  clientC = new GraphQLClient("http://localhost:4000/graphql", {
    headers: {
      authorization: `signed-utc-msg ${createAuthenticationTokenDeviceC()}`,
    },
  });
  // Device C if valid send oneTimeKeys
  const oneTimeKeys = generateOneTimeKeys(deviceC, 20);
  const createOneTimeKeys: any = await clientC.request(
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
  deviceC.mark_keys_as_published();

  // Device A: then checks if it can encrypt the existing repositories for device C and does so
});

it("update the repository from device A for device A, B & C", async () => {
  groupSessionA2 = createGroupSession();
  const groupSessionMessages =
    await claimOneTimeKeysAndCreateGroupSessionMessages(
      clientA,
      deviceA,
      [
        { idKey: deviceAKeys.idKey },
        { idKey: deviceBKeys.idKey },
        { idKey: deviceCKeys.idKey },
      ],
      groupSessionA2
    );

  const yState = Y.encodeStateAsUpdate(yDocA);
  const yStateVector = toBase64(yState);
  const encryptedContent = createRepositoryUpdate(
    groupSessionA2,
    deviceA,
    yStateVector
  );

  const updateRepositoryContentAndGroupSessionMutation: any =
    await clientA.request(
      `
      mutation updateRepositoryContentAndGroupSessionMutation($input: UpdateRepositoryContentAndGroupSessionInput!) {
        updateRepositoryContentAndGroupSession(input: $input) {
          content {
            encryptedContent
          }
        }
      }
    `,
      {
        input: {
          repositoryId: createRepositoryMutation.createRepository.repository.id,
          encryptedContent: encryptedContent,
          groupSessionMessages,
          schemaVersion: 1,
          schemaVersionSignature: deviceA.sign("1"),
        },
      }
    );

  expect(
    updateRepositoryContentAndGroupSessionMutation
      .updateRepositoryContentAndGroupSession.content
  ).toBeDefined();
});

it("query repositories from deviceA", async () => {
  const repositoriesQuery: any = await clientA.request(repositoriesQueryString);

  const yDocA = new Y.Doc();
  user1DeviceAInboundGroupSessions = updateYDocWithContentEntries(
    yDocA,
    deviceA,
    repositoriesQuery.allRepositories[0].content,
    user1DeviceAInboundGroupSessions
  );
  expect(yDocA.getXmlFragment("page").toString()).toBe(
    "Hello World and Solarsystem"
  );
});

it("query and verify unkown but verified devices", async () => {
  const devicesQuery = `
  query devices {
    devices {
      id,
      idKey,
      signingKey,
      signatures
    }
  }`;
  const clientBDevicesQuery: any = await clientB.request(devicesQuery);
  const resultsB = clientBDevicesQuery.devices.map((device: any) => {
    return verifyDevice(device, getUser1SigningKey());
  });
  expect(resultsB[0]).toBe(true);
  expect(resultsB[1]).toBe(true);
  expect(resultsB[2]).toBe(true);

  const clientCDevicesQuery: any = await clientC.request(devicesQuery);
  const resultsC = clientCDevicesQuery.devices.map((device: any) => {
    return verifyDevice(device, getUser1SigningKey());
  });
  expect(resultsC[0]).toBe(true);
  expect(resultsC[1]).toBe(true);
  expect(resultsC[2]).toBe(true);
});

it("create a user 2", async () => {
  user2DeviceA = getUser2DeviceA();
  user2DeviceAKeys = generateKeys(user2DeviceA, 10);
  createUser2 = await user2ClientA.request(
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
          idKey: user2DeviceAKeys.idKey,
          oneTimeKeys: user2DeviceAKeys.oneTimeKeys,
          signingKey: user2DeviceAKeys.signingKey,
          signature: signDeviceUser2(user2DeviceAKeys),
          fallbackKey: user2DeviceAKeys.fallbackKey,
          fallbackKeySignature: user2DeviceAKeys.fallbackKeySignature,
        },
        signingKey: getUser2SigningKey(),
      },
    }
  );
  user2DeviceA.mark_keys_as_published();

  expect(createUser2.createUser.user.id).toBeDefined();
  expect(createUser2.createUser.user.devices[0].idKey).toBe(
    user2DeviceAKeys.idKey
  );

  user2ClientA = new GraphQLClient("http://localhost:4000/graphql", {
    headers: {
      authorization: `signed-utc-msg ${createAuthenticationTokenUser2DeviceA()}`,
    },
  });
});

it("send oneTimeKeys from user 2 device A", async () => {
  const oneTimeKeys = generateOneTimeKeys(user2DeviceA, 20);
  const createOneTimeKeys: any = await user2ClientA.request(
    `mutation sendOneTimeKeys($input: SendOneTimeKeysInput!) {
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
  user2DeviceA.mark_keys_as_published();
});

it("connect user 1 and user 2 by add contact", async () => {
  // User 1 part
  deviceCKeys = generateKeys(deviceC, 1);
  const serverSecret = generateVerificationCode();
  const clientSecret = generateVerificationCode();
  const messageToTransfer = JSON.stringify({
    userId: createUserA.createUser.user.id,
    userSigningKey: getUser1SigningKey(),
    serverSecret,
    clientSecret,
  });

  const createContactInvitationMutationResult: any = await clientC.request(
    `mutation createContactInvitation($input: CreateContactInvitationInput!) {
      createContactInvitation(input: $input) {
        contactInvitation {
          id
        }
      }
    }`,
    { input: { serverSecret } }
  );
  expect(
    createContactInvitationMutationResult.createContactInvitation
      .contactInvitation.id
  ).toBeDefined();

  // User 2 part
  const transferredData = JSON.parse(messageToTransfer);
  const signedContact = signContactUserKey(
    getUser2SigningPrivateKey(),
    transferredData.userSigningKey
  );

  const devicesForContactInvitationResult: any = await clientA.request(
    `query devicesForContactInvitation($userId: ID!, $userSigningKey: String!, $serverSecret: String!) {
      devicesForContactInvitation(userId: $userId, userSigningKey: $userSigningKey, serverSecret: $serverSecret) {
        id
        idKey
        signingKey
        signatures
      }
    }`,
    {
      userId: transferredData.userId,
      userSigningKey: transferredData.userSigningKey,
      serverSecret: transferredData.serverSecret,
    }
  );

  const contactInfoMessages = await Promise.all(
    devicesForContactInvitationResult.devicesForContactInvitation.map(
      async (targetDevice: {
        idKey: string;
        signingKey: string;
        signatures: string[];
      }) => {
        expect(verifyDevice(targetDevice, transferredData.userSigningKey)).toBe(
          true
        );
        const oneTimeKeyWithDeviceIdKey = await claimOneTimeKey(
          clientA,
          targetDevice.idKey
        );
        return createContactInfoMessage(
          user2DeviceA,
          targetDevice.idKey,
          oneTimeKeyWithDeviceIdKey.oneTimeKey.key,
          transferredData.clientSecret,
          createUser2.createUser.user.id,
          getUser2SigningKey()
        );
      }
    )
  );

  const acceptContactInvitationMutationResult: any = await user2ClientA.request(
    `mutation acceptContactInvitation($input: AcceptContactInvitationInput!) {
      acceptContactInvitation(input: $input) {
        contactInvitation {
          id
        }
      }
    }`,
    {
      input: {
        userId: transferredData.userId,
        userSigningKey: transferredData.userSigningKey,
        serverSecret: transferredData.serverSecret,
        signature: signedContact,
        contactInfoMessage: JSON.stringify(contactInfoMessages),
      },
    }
  );
  expect(
    acceptContactInvitationMutationResult.acceptContactInvitation
      .contactInvitation.id
  ).toBeDefined();

  // User 1 part
  const contactInvitationsResult: any = await clientC.request(
    `query contactInvitations {
      contactInvitations {
        id
        status
        contactInfoMessage
        acceptedByUserId
      }
    }`
  );

  expect(contactInvitationsResult.contactInvitations[0].status).toBe(
    "ACCEPTED"
  );

  const receivedContactInfoMessages = JSON.parse(
    contactInvitationsResult.contactInvitations[0].contactInfoMessage
  );
  // complete contact adding for the inviter
  // TODO decrypt message
  const decryptedContactInfoMessage = decryptContactInfoMessage(
    receivedContactInfoMessages.find(
      (entry: any) => entry.deviceIdKey === deviceCKeys.idKey
    ).encryptedMessage,
    deviceC
  );

  // verify clientSecret
  expect(decryptedContactInfoMessage.clientSecret).toBe(clientSecret);

  const signedContact2 = signContactUserKey(
    getUser1SigningPrivateKey(),
    decryptedContactInfoMessage.userSigningKey
  );
  const completeContactInvitationResult: any = await clientC.request(
    `mutation completeContactInvitation($input: CompleteContactInvitationInput!) {
      completeContactInvitation(input: $input) {
        contactInvitation {
          status
        }
      }
    }`,
    {
      input: {
        contactInvitationId: contactInvitationsResult.contactInvitations[0].id,
        userSigningKey: decryptedContactInfoMessage.userSigningKey,
        signature: signedContact2,
        userId: decryptedContactInfoMessage.userId,
      },
    }
  );

  expect(
    completeContactInvitationResult.completeContactInvitation.contactInvitation
      .status
  ).toBe("COMPLETED");
});

it("add contact to private info for all devices", async () => {
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
  const yContactsMock = new Y.XmlText();
  yContactsMock.insert(0, "Max");
  yPrivateInfoDoc.getXmlFragment("page").insert(1, [yContactsMock]);
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
  expect(yDoc.getXmlFragment("page").toString()).toBe("Max");
});

it("fetch devices for the other user, verify them and add to repo (user1 to user2)", async () => {
  const contactsResult: any = await clientA.request(
    `query contacts {
      contacts {
        id
        contactSigningKey
        signatures
      }
    }`
  );

  if (
    !verifyContact(contactsResult.contacts[0].signatures, getUser1SigningKey())
  ) {
    // should not happend
    expect(false).toBe(true);
  }

  const devicesForContactResult: any = await clientA.request(
    `query devicesForContact($contactId: ID!) {
      devicesForContact(contactId: $contactId) {
        id
        idKey
        signingKey
        signatures
      }
    }`,
    { contactId: contactsResult.contacts[0].id }
  );

  // TODO check if msg is even correct since .signatures might be an array
  const msg = JSON.parse(contactsResult.contacts[0].signatures);
  const [_, contactUserSigningKey] = msg.message.split(" ");
  const resultVerification = devicesForContactResult.devicesForContact.map(
    (device: any) => {
      return verifyDevice(device, contactUserSigningKey);
    }
  );
  expect(resultVerification[0]).toBe(true);

  // Device A: fetching user2DeviceA onetime key
  const parsedMsg = JSON.parse(
    devicesForContactResult.devicesForContact[0].signatures[0]
  );
  const deviceIdKey = parsedMsg.message.split(" ")[2];

  const oneTimeKeyWithDeviceIdKey = await claimOneTimeKey(clientA, deviceIdKey);
  const groupSessionMessage = createGroupSessionMessage(
    groupSessionA2.prevKeyMessage,
    deviceA,
    deviceIdKey,
    oneTimeKeyWithDeviceIdKey.oneTimeKey.key
  );
  const repositoryGroupMessages = {
    repositoryId: createRepositoryMutation.createRepository.repository.id,
    groupSessionMessages: [groupSessionMessage],
  };
  const addCollaboratorToRepositoriesMutationResult: any =
    await clientA.request(
      `mutation addCollaboratorToRepositories($input: AddCollaboratorToRepositoriesInput!) {
      addCollaboratorToRepositories(input: $input) {
        entries {
          repositoryId
          groupSessionMessageIds
        }
      }
    }`,
      {
        input: {
          repositoryGroupMessages,
          contactId: contactsResult.contacts[0].id,
        },
      }
    );
  expect(
    addCollaboratorToRepositoriesMutationResult.addCollaboratorToRepositories
      .entries[0].repositoryId
  ).toBe(createRepositoryMutation.createRepository.repository.id);
  expect(
    addCollaboratorToRepositoriesMutationResult.addCollaboratorToRepositories
      .entries[0].groupSessionMessageIds.length
  ).toBe(4);
});

it("query repositories from user2DeviceA", async () => {
  const repositoriesQuery: any = await user2ClientA.request(
    repositoriesQueryString,
    { deviceIdKey: user2DeviceAKeys.idKey }
  );

  const yDoc = new Y.Doc();
  user2DeviceAInboundGroupSessions = updateYDocWithContentEntries(
    yDoc,
    user2DeviceA,
    repositoriesQuery.allRepositories[0].content,
    user2DeviceAInboundGroupSessions
  );
  expect(yDoc.getXmlFragment("page").toString()).toBe(
    "Hello World and Solarsystem"
  );
});

it("update the repository with a new groupsession", async () => {
  const yXmlText = new Y.XmlText();
  yXmlText.insert(0, "!");
  yDocA.getXmlFragment("page").insert(1, [yXmlText]);
  const yState = Y.encodeStateAsUpdate(yDocA);
  const yStateVector = toBase64(yState);

  groupSessionA3 = createGroupSession();
  const groupSessionMessages =
    await claimOneTimeKeysAndCreateGroupSessionMessages(
      clientA,
      deviceA,
      createUserA.createUser.user.devices,
      groupSessionA3
    );

  const encryptedContent = createRepositoryUpdate(
    groupSessionA3,
    deviceA,
    yStateVector
  );

  const updateRepositoryContentAndGroupSessionMutation: any =
    await clientA.request(
      `
      mutation updateRepositoryContentAndGroupSessionMutation($input: UpdateRepositoryContentAndGroupSessionInput!) {
        updateRepositoryContentAndGroupSession(input: $input) {
          content {
            encryptedContent
          }
        }
      }
    `,
      {
        input: {
          repositoryId: createRepositoryMutation.createRepository.repository.id,
          encryptedContent: encryptedContent,
          groupSessionMessages,
          schemaVersion: 1,
          schemaVersionSignature: deviceA.sign("1"),
        },
      }
    );

  expect(
    updateRepositoryContentAndGroupSessionMutation
      .updateRepositoryContentAndGroupSession.content
  ).toBeDefined();
});

it("delete user1's device B from clientB", async () => {
  const deleteDeviceMutation: any = await clientB.request(
    `
      mutation deleteDevice($input: DeleteDeviceInput!) {
        deleteDevice(input: $input) {
          success
        }
      }
    `,
    { input: { deviceIdKey: deviceBKeys.idKey } }
  );

  expect(deleteDeviceMutation.deleteDevice.success).toBe(true);
});

it("delete user 1", async () => {
  const deleteUserMutation: any = await clientA.request(
    `
      mutation deleteUser($input: DeleteUserInput!) {
        deleteUser(input: $input) {
          success
        }
      }
    `,
    { input: {} }
  );

  expect(deleteUserMutation.deleteUser.success).toBe(true);
});

// cross signing:
// every user keeps a list of their signed devices, when verifying a device I need ot check that the public key is valid! then I can verify all the device

// a user can have multiple signing keys and eventually release them. they can cycle through
// .e.g when I remove a device!
// -> not decided yet: does this mean the all devices get invalided from this key or can a verified device
// create another signed key. maybe multiple devices can do

// Question: What about when I add a new device. Do I send a message with all existing ones?!?
// Question: how about contacts?
// myDevices -> only available to me
// myDevices to be queries by others -> they way others can

// A. with one user private key I can sign all devices -> only need to accpet one device get access to all
// one public key per user
// invalidation: create a new user key, sign my own devices -> send new public key to other devices/users
// master devices (with user private user key) / slave devices (without private user key)
