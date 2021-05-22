import { spawn } from "child_process";
import { GraphQLClient } from "graphql-request";
import * as Y from "yjs";
import {
  getDeviceA,
  generateKeys,
  generateOneTimeKeys,
  toBase64,
  createGroupSession,
  createRepositoryUpdate,
  updateYDocWithContentEntries,
  getUser1SigningKey,
  signDeviceUser1,
  createAuthenticationTokenDeviceA,
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
let deviceA: any = null;
let deviceAKeys: any = null;
let user1DeviceAInboundGroupSessions: any = {};
let yDocA: any = null;
let createUserA: any = null;
let groupSessionA: GroupSession;
let createRepositoryMutation: any = null;
let repositoriesQueryResult1: any = null;
let repositoriesQueryResult2: any = null;
let repositoriesQueryResult3: any = null;

const repositoriesQueryString = `
query repositoriesQuery($lastContentUpdateIntegrityIdsByRepository: [LastContentUpdateIntegrityIdByRepository!]) {
  allRepositories(lastContentUpdateIntegrityIdsByRepository: $lastContentUpdateIntegrityIdsByRepository) {
    __typename
    ... on Repository {
      id
      lastContentUpdateIntegrityId
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
      }
    }
    ... on RepositoryTombstone {
      id
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

it("create a repository", async () => {
  yDocA = new Y.Doc();
  const yXmlText = new Y.XmlText();
  yXmlText.insert(0, "Hello World");
  yDocA.getXmlFragment("page").insert(0, [yXmlText]);
  const yStateA = Y.encodeStateAsUpdate(yDocA);
  const encodedYStateA = toBase64(yStateA);

  groupSessionA = createGroupSession();
  const groupSessionMessages = await claimOneTimeKeysAndCreateGroupSessionMessages(
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

it("query repositories from deviceA", async () => {
  repositoriesQueryResult1 = await clientA.request(repositoriesQueryString);

  //   console.log(repositoriesQueryResult1.allRepositories[]);

  const yDoc = new Y.Doc();
  user1DeviceAInboundGroupSessions = updateYDocWithContentEntries(
    yDoc,
    deviceA,
    repositoriesQueryResult1.allRepositories[0].content,
    user1DeviceAInboundGroupSessions
  );
  expect(yDoc.getXmlFragment("page").toString()).toBe("Hello World");
});

it("query repositories from deviceA with lastContentUpdateIntegrityIdByRepository", async () => {
  repositoriesQueryResult2 = await clientA.request(repositoriesQueryString, {
    lastContentUpdateIntegrityIdsByRepository: repositoriesQueryResult1.allRepositories.map(
      (repo: any) => {
        return {
          repositoryId: repo.id,
          lastContentUpdateIntegrityId: repo.lastContentUpdateIntegrityId,
        };
      }
    ),
  });

  expect(repositoriesQueryResult2.allRepositories[0].content).toStrictEqual([]);
  expect(
    repositoriesQueryResult2.allRepositories[0]
      .lastContentUpdateIntegrityIdByRepository
  ).toBe(
    repositoriesQueryResult1.allRepositories[0]
      .lastContentUpdateIntegrityIdByRepository
  );
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
      },
    }
  );

  expect(
    updateRepositoryContentMutation.updateRepositoryContent.content
  ).toBeDefined();
});

it("query repositories from deviceA with lastContentUpdateIntegrityIdByRepository", async () => {
  repositoriesQueryResult3 = await clientA.request(repositoriesQueryString, {
    lastContentUpdateIntegrityIdsByRepository: repositoriesQueryResult2.allRepositories.map(
      (repo: any) => {
        return {
          repositoryId: repo.id,
          lastContentUpdateIntegrityId: repo.lastContentUpdateIntegrityId,
        };
      }
    ),
  });

  expect(repositoriesQueryResult3.allRepositories[0].content).not.toBe([]);

  const yDoc = new Y.Doc();
  user1DeviceAInboundGroupSessions = updateYDocWithContentEntries(
    yDoc,
    deviceA,
    repositoriesQueryResult3.allRepositories[0].content,
    user1DeviceAInboundGroupSessions
  );
  expect(yDoc.getXmlFragment("page").toString()).toBe(
    "Hello World and Solarsystem"
  );
});
