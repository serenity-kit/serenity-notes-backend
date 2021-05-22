import * as crypto from "crypto";
import * as base64 from "base-64";
import * as Y from "yjs";
import Olm from "olm";
import {
  GroupSession,
  DevicePublicIdentityKeys,
  OneTimeKeyWithSignature,
} from "./types";

export const generateVerificationCode = () =>
  Math.random().toString().slice(2, 8);

export const encryptAes = (value: string, secret: string) => {
  const key = crypto
    .createHash("sha256")
    .update(String(secret))
    .digest("base64")
    .substr(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
  let encrypted = cipher.update(value);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return JSON.stringify({
    iv: iv.toString("hex"),
    msg: encrypted.toString("hex"),
  });
};

export const decryptAes = (value: string, secret: string) => {
  const key = crypto
    .createHash("sha256")
    .update(String(secret))
    .digest("base64")
    .substr(0, 32);
  const content = JSON.parse(value);
  const iv = Buffer.from(content.iv, "hex");
  const encryptedText = Buffer.from(content.msg, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

export const toBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return base64.encode(s);
};

export const fromBase64 = (s: string) => {
  const a = base64.decode(s);
  const bytes = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    bytes[i] = a.charCodeAt(i);
  }
  return bytes;
};

const pickleKey = "ATHENA";

const pickledUser1DeviceA =
  "WFO15mQ/jFx5NmayAg8EWZlP61SGiP6EsjCBgMYfe9Ro1w/BWmtlRgwm7QaKFMZX7omUyARdS4+qdmfWyjbI37EAcV6nboubfSvWyFugGrlkd3nLmTgJWS8XRwhfguJYpCEA7aM70PeTga6Z38RDcDN09OvFPZO1A+fHjVOv7oRKi+9eCdIQ7V+JMKUHspPCsz07mIwAsGejkBMIYIR9upfZ0ORb+0jB8bzgaQTK++Djl6A5SXEyYg";
const pickledUser1DeviceB =
  "csQEmXBrS3O6biNXcTwXgptFAGFS9gskUcGxMKwJQv1WTROC21JH5Zub2cXWN2ixyjROS4gtxShAPE7iTEczkf00z2hwFKJbU4LtFT0XFtG1/sSTaG4JmaVdF8QpVkCH+EzzLx1JEgUCL41lG0ssKcbMFCDSxVxIoI1J4g3wLb/7cAgRGVm2wh0gqJw2lurRFEh+O+1VUMHp1DrcUtMADmwgAY9baVKbscFBBl8brd3yAJZkiMLuNw";
const pickledUser1DeviceC =
  "PoqzYA/LMcGDaX2so8V0mtVwCnDcPbI8U+Vf9jnzv+uDr3JijO21Y+cdXqICKyGtD99++/EpkqbhbSne76AXw5GEn7aq/JW8pYY+3gjRMivE5BWWG+rXt/iEoGUgCVrAyc1WjjLk//iuSzJw8k/dH5oziAeMEmnkdJz9CIWY58M7+BabioGdDpldgIgAhRWw21IiLwuPjQnj41X2c9+VRJXHCllHT+SEFX6Dev5Jdw/seLpGd4QUvg";
const user1SigningPrivateKey = "PjNGlnyHTCpuTsjHc+gjDAc7cZDeTHN6Q6anE7Ck3Bs=";

const pickledUser2DeviceA =
  "nS3x56at07OUzmRxLUqhP6NDcWZClXl5Zgq9WQWPNvf8xpEaR2Bhb2b4sy8KAqabZHeWo5Vq5yUFfg2uUjBVQr0ddSPbzVCH+THlqXra4CdNUzn2adC5pen9d2xG15kd9SUgrYzGmxOtLLL+ZA+QLqEcZ6Z+8cMVZqCKLqsCOaYrf/yMRBLrbNaBMlhSNkXJmWu+ToTm+/bPgIh04e7jkN3AHuc0nJdUBOjWeMgB3zdYYZQoHItDIw";
const user2SigningPrivateKey = "Zsrb1cSBKUnYBepZCeGNo8nxRHoRLSd/TOELpsH9S4k=";

export const generateKeys = (
  device: Olm.Account,
  oneTimeKeysAmount: number
) => {
  device.generate_one_time_keys(oneTimeKeysAmount);
  const deviceIdKeys = JSON.parse(device.identity_keys());
  const idKey = deviceIdKeys.curve25519;
  const signingKey = deviceIdKeys.ed25519;

  const deviceOnetimeKeys = JSON.parse(device.one_time_keys());
  let oneTimeKeys: OneTimeKeyWithSignature[] = [];
  for (let key in deviceOnetimeKeys.curve25519) {
    oneTimeKeys.push({
      key: deviceOnetimeKeys.curve25519[key],
      signature: device.sign(deviceOnetimeKeys.curve25519[key]),
    });
  }

  device.generate_fallback_key();
  let fallbackKey = "";
  const deviceFallbackKeys = JSON.parse(device.fallback_key());
  for (let key in deviceFallbackKeys.curve25519) {
    fallbackKey = deviceFallbackKeys.curve25519[key];
  }
  const fallbackKeySignature = device.sign(fallbackKey);

  return { idKey, signingKey, oneTimeKeys, fallbackKey, fallbackKeySignature };
};

export const generateOneTimeKeys = (
  device: Olm.Account,
  oneTimeKeysAmount: number
) => {
  device.generate_one_time_keys(oneTimeKeysAmount);
  const deviceOnetimeKeys = JSON.parse(device.one_time_keys());
  let oneTimeKeys: OneTimeKeyWithSignature[] = [];
  for (let key in deviceOnetimeKeys.curve25519) {
    oneTimeKeys.push({
      key: deviceOnetimeKeys.curve25519[key],
      signature: device.sign(deviceOnetimeKeys.curve25519[key]),
    });
  }
  return oneTimeKeys;
};

export const generateSigningPrivateKey = () => {
  const signing = new Olm.PkSigning();
  const privateKey = signing.generate_seed();
  return toBase64(privateKey);
};

const generateSigningPublicKey = (privateKey: string) => {
  const seed = fromBase64(privateKey);
  const signing = new Olm.PkSigning();
  const publicKey = signing.init_with_seed(seed);
  return publicKey;
};

export const getUser1SigningPrivateKey = () => {
  return user1SigningPrivateKey;
};

export const getUser2SigningPrivateKey = () => {
  return user2SigningPrivateKey;
};

export const getUser1SigningKey = () => {
  // to init see generateSigningPrivateKey
  return generateSigningPublicKey(user1SigningPrivateKey);
};

export const getUser2SigningKey = () => {
  // to init see generateSigningPrivateKey
  return generateSigningPublicKey(user2SigningPrivateKey);
};

export const getDeviceSigningKeys = (pickledDevice: string) => {
  const device = new Olm.Account();
  device.unpickle(pickleKey, pickledDevice);
  const deviceIdKeys = JSON.parse(device.identity_keys());
  return {
    privateSigningKey: pickledDevice,
    publicSigningKey: deviceIdKeys.ed25519,
  };
};

export const createAuthenticationTokenDeviceA = () => {
  const message = new Date().toISOString();
  const device = new Olm.Account();
  device.unpickle(pickleKey, pickledUser1DeviceA);
  const deviceIdKeys = JSON.parse(device.identity_keys());
  const signature = device.sign(message);
  return `${deviceIdKeys.ed25519} ${message} ${signature}`;
};

export const createAuthenticationTokenDeviceB = () => {
  const message = new Date().toISOString();
  const device = new Olm.Account();
  device.unpickle(pickleKey, pickledUser1DeviceB);
  const deviceIdKeys = JSON.parse(device.identity_keys());
  const signature = device.sign(message);
  return `${deviceIdKeys.ed25519} ${message} ${signature}`;
};

export const createAuthenticationTokenDeviceC = () => {
  const message = new Date().toISOString();
  const device = new Olm.Account();
  device.unpickle(pickleKey, pickledUser1DeviceC);
  const deviceIdKeys = JSON.parse(device.identity_keys());
  const signature = device.sign(message);
  return `${deviceIdKeys.ed25519} ${message} ${signature}`;
};

export const createAuthenticationTokenUser2DeviceA = () => {
  const message = new Date().toISOString();
  const device = new Olm.Account();
  device.unpickle(pickleKey, pickledUser2DeviceA);
  const deviceIdKeys = JSON.parse(device.identity_keys());
  const signature = device.sign(message);
  return `${deviceIdKeys.ed25519} ${message} ${signature}`;
};

export const signContactUserKey = (
  signingPrivateKey: string,
  contactUserSigningKey: string
) => {
  const seed = fromBase64(signingPrivateKey);
  const signing = new Olm.PkSigning();
  signing.init_with_seed(seed);
  const myUserSigningKey = generateSigningPublicKey(signingPrivateKey);
  const message = `${myUserSigningKey} ${contactUserSigningKey}`;
  const signature = signing.sign(message);
  return JSON.stringify({
    version: 1,
    message,
    signature,
  });
};

export const verifyContact = (signatures: string[], userSigningKey: string) => {
  // currently we only verify one signature, later this should expand to multiple
  const signatureContent = JSON.parse(signatures[0]);
  if (signatureContent.version !== 1) return false;
  const keys = signatureContent.message.split(" ");
  if (keys[0] !== userSigningKey) return false;

  const olmUtil = new Olm.Utility();
  try {
    olmUtil.ed25519_verify(
      userSigningKey,
      signatureContent.message,
      signatureContent.signature
    );
    return true;
  } catch (err) {
    return false;
  }
};

export const signDevice = (
  deviceKeys: DevicePublicIdentityKeys,
  userSigningPrivateKey: string
) => {
  deviceKeys.idKey;
  deviceKeys.signingKey;

  const seed = fromBase64(userSigningPrivateKey);
  const signing = new Olm.PkSigning();
  signing.init_with_seed(seed);
  const userSigningPublicKey = generateSigningPublicKey(userSigningPrivateKey);
  const message = `${userSigningPublicKey} ${deviceKeys.signingKey} ${deviceKeys.idKey}`;
  const signature = signing.sign(message);
  return JSON.stringify({
    version: 1,
    message,
    signature,
  });
};

export const signDeviceUser1 = (deviceKeys: DevicePublicIdentityKeys) => {
  return signDevice(deviceKeys, user1SigningPrivateKey);
};

export const signDeviceUser2 = (deviceKeys: DevicePublicIdentityKeys) => {
  return signDevice(deviceKeys, user2SigningPrivateKey);
};

export const verifyDevice = (
  deviceInfo: {
    idKey: string;
    signingKey: string;
    signatures: string[];
  },
  userSigningKey: string
) => {
  // currently we only verify one signature, later this should expand to multiple
  const signatureContent = JSON.parse(deviceInfo.signatures[0]);
  if (signatureContent.version !== 1) return false;
  const keys = signatureContent.message.split(" ");
  if (keys[0] !== userSigningKey) return false;
  if (keys[1] !== deviceInfo.signingKey) return false;
  if (keys[2] !== deviceInfo.idKey) return false;

  const olmUtil = new Olm.Utility();
  try {
    olmUtil.ed25519_verify(
      userSigningKey,
      signatureContent.message,
      signatureContent.signature
    );
    return true;
  } catch (err) {
    return false;
  }
};

export const getDeviceA = () => {
  const device = new Olm.Account();
  device.unpickle(pickleKey, pickledUser1DeviceA);
  return device;
};

export const getDeviceB = () => {
  const device = new Olm.Account();
  device.unpickle(pickleKey, pickledUser1DeviceB);
  return device;
};

export const getDeviceC = () => {
  const device = new Olm.Account();
  device.unpickle(pickleKey, pickledUser1DeviceC);
  return device;
};

export const getUser2DeviceA = () => {
  const device = new Olm.Account();
  device.unpickle(pickleKey, pickledUser2DeviceA);
  return device;
};

export type Device = {
  idKey: string;
};

export const createGroupSession = (): GroupSession => {
  // create outbound session
  const outboundGroupSession = new Olm.OutboundGroupSession();
  outboundGroupSession.create();
  return {
    session: outboundGroupSession,
    prevKeyMessage: {
      sessionId: outboundGroupSession.session_id(),
      sessionKey: outboundGroupSession.session_key(),
      messageIndex: outboundGroupSession.message_index(),
    },
  };
};

export const createAddDeviceMessage = (
  currentDevice: any,
  deviceIdKey: string,
  deviceOnetimeKey: string,
  secret: string
) => {
  // device outbound session to other device
  const session = new Olm.Session();
  session.create_outbound(currentDevice, deviceIdKey, deviceOnetimeKey);
  return session.encrypt(secret);
};

export const createContactInfoMessage = (
  currentDevice: any,
  deviceIdKey: string,
  deviceOnetimeKey: string,
  clientSecret: string,
  userId: string,
  userSigningKey: string
) => {
  // device outbound session to other device
  const session = new Olm.Session();
  session.create_outbound(currentDevice, deviceIdKey, deviceOnetimeKey);
  return {
    deviceIdKey,
    encryptedMessage: session.encrypt(
      JSON.stringify({
        clientSecret,
        userId,
        userSigningKey,
      })
    ),
  };
};

export const decryptContactInfoMessage = (message: any, device: any) => {
  // device outbound session to other device
  const session = new Olm.Session();
  // TODO several security checks
  session.create_inbound(device, message.body);
  const contactInfo = session.decrypt(message.type, message.body);
  device.remove_one_time_keys(session);
  return JSON.parse(contactInfo);
};

export const createGroupSessionMessage = (
  groupSessionAKeyMsg: any,
  currentDevice: any,
  targetDeviceIdKey: string,
  targetDeviceOneTimeKey: string
) => {
  // create 1 on 1 message for each of the other devices
  const jsonmsg = JSON.stringify(groupSessionAKeyMsg);

  // device outbound session to other device
  const session = new Olm.Session();
  session.create_outbound(
    currentDevice,
    targetDeviceIdKey,
    targetDeviceOneTimeKey
  );
  const encryptedSessionMessage = session.encrypt(jsonmsg);
  return {
    ...encryptedSessionMessage,
    targetDeviceIdKey: targetDeviceIdKey,
  };
};

export const createRepositoryUpdate = (
  outboundGroupSession: GroupSession,
  currentDevice: any,
  encodedYState: string
) => {
  // The sessionKey and message index updates after every encrypt.
  // We keep the key message content right before the encrypt so we can
  // use it to share the outboundGroupSession without encrypting again,
  // but also only the most recent one to avoid them getting access to earlier messages
  outboundGroupSession.prevKeyMessage = {
    sessionId: outboundGroupSession.session.session_id(),
    sessionKey: outboundGroupSession.session.session_key(),
    messageIndex: outboundGroupSession.session.message_index(),
  };

  // create group message
  const encryptedGroupMessage = outboundGroupSession.session.encrypt(
    encodedYState
  );
  const signature = currentDevice.sign(encryptedGroupMessage);

  const deviceIdKeys = JSON.parse(currentDevice.identity_keys());

  const packet = {
    senderIdKey: deviceIdKeys.curve25519,
    senderSigningKey: deviceIdKeys.ed25519,
    sessionId: outboundGroupSession.session.session_id(),
    body: encryptedGroupMessage,
    signature: signature,
  };
  return JSON.stringify(packet);
};

export const updateYDocWithContentEntries = (
  yDoc: any,
  device: any,
  content: any,
  inboundGroupSessions: any[]
) => {
  // using a for loop to run in sequence to match the app behaviour
  for (const contentEntry of content) {
    const receivedPacket = JSON.parse(contentEntry.encryptedContent);
    const inboundSession = new Olm.InboundGroupSession();
    // Unpickle an existing session if available, otherwise decrypt the
    // inboundGroupSession message.
    // This is necessary since the oneTimeKey for decrypting the
    // inboundGroupSession message already has been used and removed.
    if (
      inboundGroupSessions[receivedPacket.senderIdKey] &&
      inboundGroupSessions[receivedPacket.senderIdKey].sessionId ===
        receivedPacket.sessionId
    ) {
      inboundSession.unpickle(
        pickleKey,
        inboundGroupSessions[receivedPacket.senderIdKey].pickledSession
      );
    } else {
      const session = new Olm.Session();
      session.create_inbound(device, contentEntry.groupSessionMessage.body);
      const groupSessionInfoEncrypted = session.decrypt(
        contentEntry.groupSessionMessage.type,
        contentEntry.groupSessionMessage.body
      );
      device.remove_one_time_keys(session);
      const groupSessionInfo = JSON.parse(groupSessionInfoEncrypted);
      inboundSession.create(groupSessionInfo.sessionKey);
      if (inboundSession.session_id() !== groupSessionInfo.sessionId) {
        throw new Error("Session ID missmatch");
      }
    }
    // TODO serveral checks!

    // TODO wrap in try/catch and catch OLM.UNKNOWN_MESSAGE_INDEX
    const decryptedResult = inboundSession.decrypt(receivedPacket.body);
    // @ts-ignore since it's typed as `object`
    const yState = fromBase64(decryptedResult.plaintext);
    Y.applyUpdate(yDoc, yState);

    inboundGroupSessions[receivedPacket.senderIdKey] = {
      sessionId: receivedPacket.sessionId,
      pickledSession: inboundSession.pickle(pickleKey),
    };
  }
  return inboundGroupSessions;
};

export const updateYDocWithPrivateInfoContentEntries = (
  yDoc: any,
  device: any,
  content: any
) => {
  // using a for loop to run in sequence to match the app behaviour
  for (const contentEntry of content) {
    // always expects a new groupsession message for privateInfo updates
    const session = new Olm.Session();
    session.create_inbound(
      device,
      contentEntry.privateInfoGroupSessionMessage.body
    );
    const groupSessionInfoEncrypted = session.decrypt(
      contentEntry.privateInfoGroupSessionMessage.type,
      contentEntry.privateInfoGroupSessionMessage.body
    );
    device.remove_one_time_keys(session);
    const groupSessionInfo = JSON.parse(groupSessionInfoEncrypted);
    const inboundSession = new Olm.InboundGroupSession();
    inboundSession.create(groupSessionInfo.sessionKey);
    if (inboundSession.session_id() !== groupSessionInfo.sessionId) {
      throw new Error("Session ID missmatch");
    }
    const receivedPacket = JSON.parse(contentEntry.encryptedContent);
    // TODO serveral checks!

    // TODO wrap in try/catch and catch OLM.UNKNOWN_MESSAGE_INDEX
    const decryptedResult = inboundSession.decrypt(receivedPacket.body);
    // @ts-ignore since it's typed as `object`
    const yState = fromBase64(decryptedResult.plaintext);
    Y.applyUpdate(yDoc, yState);
  }
};

export async function claimOneTimeKeysAndCreateGroupSessionMessages(
  client: any,
  device: any,
  targetDevices: { idKey: string }[],
  groupSession: GroupSession
) {
  const deviceIdKeys = targetDevices.map((device) => device.idKey);
  const claimOneTimeKeysMutation: any = await client.request(
    `
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
  `,
    { input: { deviceIdKeys } }
  );

  return claimOneTimeKeysMutation.claimOneTimeKeysForMultipleDevices.oneTimeKeysWithDeviceIdKey.map(
    (oneTimeKeyWithDeviceIdKey: any) => {
      return createGroupSessionMessage(
        groupSession.prevKeyMessage,
        device,
        oneTimeKeyWithDeviceIdKey.deviceIdKey,
        oneTimeKeyWithDeviceIdKey.oneTimeKey.key
      );
    }
  );
}

export async function claimOneTimeKey(client: any, deviceIdKey: string) {
  const claimOneTimeKeysMutation: any = await client.request(
    `
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
  `,
    { input: { deviceIdKeys: [deviceIdKey] } }
  );

  return claimOneTimeKeysMutation.claimOneTimeKeysForMultipleDevices
    .oneTimeKeysWithDeviceIdKey[0];
}

export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function nexusStartupSleep() {
  return await delay(16000);
}

export async function nexusTeardownSleep() {
  return await delay(1000);
}
