import { spawn } from "child_process";
import { GraphQLClient } from "graphql-request";
import {
  getDeviceA,
  getUser2DeviceA,
  generateKeys,
  createContactInfoMessage,
  decryptContactInfoMessage,
  getUser1SigningKey,
  getUser1SigningPrivateKey,
  getUser2SigningKey,
  getUser2SigningPrivateKey,
  signDeviceUser1,
  signDeviceUser2,
  signContactUserKey,
  generateVerificationCode,
  createAuthenticationTokenDeviceA,
  createAuthenticationTokenUser2DeviceA,
  verifyDevice,
  nexusStartupSleep,
  nexusTeardownSleep,
  claimOneTimeKey,
} from "./helpers";
import Olm from "olm";
jest.setTimeout(25000);

let server: any;
let clientA = new GraphQLClient("http://localhost:4000/graphql");
let user2ClientA = new GraphQLClient("http://localhost:4000/graphql");
let deviceA: any = null;
let user2DeviceA: any = null;
let deviceAKeys: any = null;
let user2DeviceAKeys: any = null;
let createUserA: any = null;
let createUser2: any = null;

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

it("connect user 1 and user 2 by add contact", async () => {
  // User 1 part
  deviceAKeys = generateKeys(deviceA, 1);
  const serverSecret = generateVerificationCode();
  const clientSecret = generateVerificationCode();
  const messageToTransfer = JSON.stringify({
    userId: createUserA.createUser.user.id,
    userSigningKey: getUser1SigningKey(),
    serverSecret,
    clientSecret,
  });

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
      (entry: any) => entry.deviceIdKey === deviceAKeys.idKey
    ).encryptedMessage,
    deviceA
  );

  // verify clientSecret
  expect(decryptedContactInfoMessage.clientSecret).toBe(clientSecret);

  const signedContact2 = signContactUserKey(
    getUser1SigningPrivateKey(),
    decryptedContactInfoMessage.userSigningKey
  );
  const completeContactInvitationResult: any = await clientA.request(
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

it("delete contact fails due wrong user requesting it", async () => {
  const contactsResult: any = await clientA.request(
    `query contacts {
      contacts {
        id
        contactSigningKey
        signatures
      }
    }`
  );

  const request = async () => {
    await user2ClientA.request(
      `mutation deleteContact($input: DeleteContactInput!) {
          deleteContact(input: $input) {
            success
          }
        }`,
      { input: { contactId: contactsResult.contacts[0].id } }
    );
  };

  await expect(request()).rejects.toThrow("error");
});

it("delete contact", async () => {
  const contactsResult: any = await clientA.request(
    `query contacts {
      contacts {
        id
        contactSigningKey
        signatures
      }
    }`
  );

  const deleteContactMutationResult: any = await clientA.request(
    `mutation deleteContact($input: DeleteContactInput!) {
        deleteContact(input: $input) {
          success
        }
      }`,
    { input: { contactId: contactsResult.contacts[0].id } }
  );
  expect(deleteContactMutationResult.deleteContact.success).toBe(true);
});
