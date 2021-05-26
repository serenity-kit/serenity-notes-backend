import { CookieOptions } from "express";

export type SignedUtcMessage = {
  signingKey: string;
  utcMessage: string;
  signature: string;
};

export type CustomContext = {
  signedUtcMessage?: SignedUtcMessage;
  billingAccountAuthToken?: string;
  setCookie: (name: string, value: string, options: CookieOptions) => unknown;
  clearCookie: (name: string, options: CookieOptions) => unknown;
};
