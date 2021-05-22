import { spawn } from "child_process";
import { GraphQLClient } from "graphql-request";
import {
  getDeviceA,
  getUser2DeviceA,
  generateKeys,
  getUser1SigningKey,
  getUser2SigningKey,
  signDeviceUser1,
  signDeviceUser2,
  generateVerificationCode,
  createAuthenticationTokenDeviceA,
  createAuthenticationTokenUser2DeviceA,
  nexusStartupSleep,
  nexusTeardownSleep,
} from "./helpers";
import Olm from "olm";
jest.setTimeout(25000);

let server: any;
let clientA = new GraphQLClient("http://localhost:4000/graphql");
let user2ClientA = new GraphQLClient("http://localhost:4000/graphql");
let deviceA: any = null;
let deviceAKeys: any = null;
let createUserA: any = null;
let createUser2: any = null;
let user2DeviceA: any = null;
let user2DeviceAKeys: any = null;
let contactInvitationId: string | null = null;

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

it("create contactInvitation", async () => {
  const serverSecret = generateVerificationCode();

  const createContactInvitationMutationResult: any = await clientA.request(
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
  contactInvitationId =
    createContactInvitationMutationResult.createContactInvitation
      .contactInvitation.id;

  const contactInvitationsResult: any = await clientA.request(
    `query contactInvitations {
        contactInvitations {
          id
          status
          contactInfoMessage
          acceptedByUserId
        }
      }`
  );

  expect(contactInvitationsResult.contactInvitations[0].status).toBe("PENDING");
  expect(contactInvitationsResult.contactInvitations[0].id).toBe(
    contactInvitationId
  );
});

it("delete contactInvitation fails due wrong user requesting it", async () => {
  const request = async () => {
    await user2ClientA.request(
      `mutation deleteContactInvitation($input: DeleteContactInvitationInput!) {
          deleteContactInvitation(input: $input) {
            success
          }
        }`,
      { input: { contactInvitationId } }
    );
  };

  await expect(request()).rejects.toThrow("error");
});

it("delete contactInvitation", async () => {
  deviceAKeys = generateKeys(deviceA, 1);

  const deleteContactInvitationMutationResult: any = await clientA.request(
    `mutation deleteContactInvitation($input: DeleteContactInvitationInput!) {
        deleteContactInvitation(input: $input) {
          success
        }
      }`,
    { input: { contactInvitationId } }
  );
  expect(
    deleteContactInvitationMutationResult.deleteContactInvitation.success
  ).toBe(true);

  const contactInvitationsResult: any = await clientA.request(
    `query contactInvitations {
        contactInvitations {
          id
          status
          contactInfoMessage
          acceptedByUserId
        }
      }`
  );

  expect(contactInvitationsResult.contactInvitations.length).toBe(0);
});
