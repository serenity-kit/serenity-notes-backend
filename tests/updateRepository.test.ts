import { spawn } from "child_process";
import { GraphQLClient } from "graphql-request";
import * as Y from "yjs";
import {
  getDeviceA,
  getUser2DeviceA,
  generateKeys,
  generateOneTimeKeys,
  toBase64,
  createGroupSession,
  createRepositoryUpdate,
  getUser1SigningKey,
  getUser2SigningKey,
  signDeviceUser1,
  signDeviceUser2,
  createAuthenticationTokenDeviceA,
  createAuthenticationTokenUser2DeviceA,
  nexusStartupSleep,
  nexusTeardownSleep,
  claimOneTimeKeysAndCreateGroupSessionMessages,
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
let user2ClientA = new GraphQLClient("http://localhost:4000/graphql");
let deviceA: any = null;
let user2DeviceA: any = null;
let deviceAKeys: any = null;
let user2DeviceAKeys: any = null;
let yDocA: any = null;
let createUserA: any = null;
let createUser2: any = null;
let groupSessionA: GroupSession;
let groupSessionA3: GroupSession;
let createRepositoryMutation: any = null;

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

it("update the repository with a new groupsession fails from wrong user", async () => {
  const yXmlText = new Y.XmlText();
  yXmlText.insert(0, "!");
  yDocA.getXmlFragment("page").insert(1, [yXmlText]);
  const yState = Y.encodeStateAsUpdate(yDocA);
  const yStateVector = toBase64(yState);

  groupSessionA3 = createGroupSession();
  const groupSessionMessages =
    await claimOneTimeKeysAndCreateGroupSessionMessages(
      user2ClientA,
      user2DeviceA,
      createUser2.createUser.user.devices,
      groupSessionA3
    );

  const encryptedContent = createRepositoryUpdate(
    groupSessionA3,
    user2DeviceA,
    yStateVector
  );

  const request = async () => {
    await user2ClientA.request(
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
          schemaVersionSignature: user2DeviceA.sign("1"),
        },
      }
    );
  };

  await expect(request()).rejects.toThrow("error");
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

it("update the repository fails from wrong user", async () => {
  const yXmlText3 = new Y.XmlText();
  yXmlText3.insert(0, " and Solarsystem");
  yDocA.getXmlFragment("page").insert(1, [yXmlText3]);
  const yStateA3 = Y.encodeStateAsUpdate(yDocA);
  const yStateVectorA3 = toBase64(yStateA3);
  const encryptedContent3 = createRepositoryUpdate(
    groupSessionA3,
    user2DeviceA,
    yStateVectorA3
  );

  const request = async () => {
    await user2ClientA.request(
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
          schemaVersionSignature: user2DeviceA.sign("1"),
        },
      }
    );
  };

  await expect(request()).rejects.toThrow("error");
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
