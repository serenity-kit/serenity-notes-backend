import { makeSchema, declarativeWrappingPlugin } from "@nexus/schema";
import path from "path";
import { AddDeviceVerification } from "./graphql/AddDeviceVerification";
import { Contact } from "./graphql/Contact";
import { ContactInvitation } from "./graphql/ContactInvitation";
import { Content } from "./graphql/Content";
import { Device } from "./graphql/Device";
import { DeviceTombstone } from "./graphql/DeviceTombstone";
import { GroupSessionMessage } from "./graphql/GroupSessionMessage";
import { OneTimeKey } from "./graphql/OneTimeKey";
import { OneTimeKeyWithDeviceIdKey } from "./graphql/OneTimeKeyWithDeviceIdKey";
import { PrivateInfo } from "./graphql/PrivateInfo";
import { PrivateInfoContent } from "./graphql/PrivateInfoContent";
import { PrivateInfoGroupSessionMessage } from "./graphql/PrivateInfoGroupSessionMessage";
import { Repository } from "./graphql/Repository";
import { RepositoryResult } from "./graphql/RepositoryResult";
import { RepositoryTombstone } from "./graphql/RepositoryTombstone";
import { User } from "./graphql/User";
import { License } from "./graphql/License";
import { LicenseToken } from "./graphql/LicenseToken";
import { SubscriptionPlan } from "./graphql/SubscriptionPlan";
import {
  BillingAccount,
  BillingAccountSuscriptionStatus,
} from "./graphql/BillingAccount";
import * as MutationTypes from "./graphql/Mutation";
import {
  LastContentUpdateIntegrityIdByRepository,
  RepositoryDevicesResult,
  Query,
} from "./graphql/Query";

export const schema = makeSchema({
  plugins: [declarativeWrappingPlugin()],
  types: [
    AddDeviceVerification,
    BillingAccount,
    BillingAccountSuscriptionStatus,
    Contact,
    ContactInvitation,
    Content,
    Device,
    DeviceTombstone,
    GroupSessionMessage,
    License,
    LicenseToken,
    OneTimeKey,
    OneTimeKeyWithDeviceIdKey,
    PrivateInfo,
    PrivateInfoContent,
    PrivateInfoGroupSessionMessage,
    Repository,
    RepositoryDevicesResult,
    RepositoryResult,
    RepositoryTombstone,
    SubscriptionPlan,
    User,
    LastContentUpdateIntegrityIdByRepository,
    Query,
    ...Object.values(MutationTypes),
  ],
  outputs: {
    schema: path.join(__dirname, "/generated/schema.graphql"),
    typegen: path.join(__dirname, "/generated/typings.ts"),
  },
});
