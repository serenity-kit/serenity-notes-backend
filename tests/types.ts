export type GroupSessionKeyMessage = {
  sessionId: string;
  sessionKey: string;
  messageIndex: number;
};

export type GroupSession = {
  session: any;
  prevKeyMessage: GroupSessionKeyMessage;
};

export type DevicePublicIdentityKeys = {
  idKey: string;
  signingKey: string;
};

export type OneTimeKeyWithSignature = {
  key: string;
  signature: string;
};
