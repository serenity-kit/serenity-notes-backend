-- CreateEnum
CREATE TYPE "public"."ContactInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."RepositoryEventType" AS ENUM ('REMOVE_COLLABORATORS', 'DELETE');

-- CreateEnum
CREATE TYPE "public"."SubscriptionPlan" AS ENUM ('PERSONAL_PRO', 'TEAM');

-- CreateEnum
CREATE TYPE "public"."PaddleSubscriptionStatus" AS ENUM ('ACTIVE', 'TRAILING', 'PAST_DUE', 'PAUSED', 'DELETED');

-- CreateTable
CREATE TABLE "OneTimeKey" (
    "key" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "claimedByDeviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "idKey" TEXT NOT NULL,
    "signingKey" TEXT NOT NULL,
    "signatures" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "fallbackKey" TEXT NOT NULL,
    "fallbackKeySignature" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "signingKeys" TEXT[],

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateInfoContent" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "encryptedContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateInfoGroupSessionMessage" (
    "id" TEXT NOT NULL,
    "privateInfoContentId" TEXT,
    "type" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "targetDeviceIdKey" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "signingKey" TEXT NOT NULL,
    "contactSigningKey" TEXT NOT NULL,
    "contactUserId" TEXT NOT NULL,
    "signatures" TEXT[],

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInvitation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signingKey" TEXT NOT NULL,
    "serverSecret" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "contactInfoMessage" TEXT,
    "status" "ContactInvitationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddDeviceVerification" (
    "id" TEXT NOT NULL,
    "deviceIdKey" TEXT NOT NULL,
    "verificationMessage" TEXT NOT NULL,
    "serverSecret" TEXT NOT NULL DEFAULT E'legacy',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "encryptedContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repositoryId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupSessionMessage" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "targetDeviceIdKey" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,
    "lastContentUpdateIntegrityId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryEvents" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repositoryId" TEXT NOT NULL,
    "type" "RepositoryEventType" NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "userId" TEXT,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscriptionPlan" "SubscriptionPlan" NOT NULL,
    "purchasedLicensesQuantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "marketingConsent" BOOLEAN NOT NULL,
    "paddleUserId" TEXT NOT NULL,
    "paddleSubscriptionId" TEXT NOT NULL,
    "paddleCheckoutId" TEXT NOT NULL,
    "paddleSubscriptionStatus" "PaddleSubscriptionStatus" NOT NULL,
    "paddleCancellationEffectiveDate" TIMESTAMP(3),
    "paddlePausedFrom" TIMESTAMP(3),
    "paddleUpdateUrl" TEXT NOT NULL,
    "paddleCancelUrl" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAccountEmailToken" (
    "emailToken" TEXT NOT NULL,
    "emailTokenUsed" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT NOT NULL,
    "expiration" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("emailToken")
);

-- CreateTable
CREATE TABLE "BillingAccountAuthToken" (
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiration" TIMESTAMP(3) NOT NULL,
    "billingAccountId" TEXT NOT NULL,

    PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "_RepositoryToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_RepositoryEventsToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Device.idKey_unique" ON "Device"("idKey");

-- CreateIndex
CREATE UNIQUE INDEX "Device.signingKey_unique" ON "Device"("signingKey");

-- CreateIndex
CREATE UNIQUE INDEX "AddDeviceVerification.deviceIdKey_unique" ON "AddDeviceVerification"("deviceIdKey");

-- CreateIndex
CREATE UNIQUE INDEX "License.token_unique" ON "License"("token");

-- CreateIndex
CREATE UNIQUE INDEX "_RepositoryToUser_AB_unique" ON "_RepositoryToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_RepositoryToUser_B_index" ON "_RepositoryToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_RepositoryEventsToUser_AB_unique" ON "_RepositoryEventsToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_RepositoryEventsToUser_B_index" ON "_RepositoryEventsToUser"("B");

-- AddForeignKey
ALTER TABLE "OneTimeKey" ADD FOREIGN KEY("deviceId")REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneTimeKey" ADD FOREIGN KEY("claimedByDeviceId")REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD FOREIGN KEY("userId")REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateInfoContent" ADD FOREIGN KEY("deviceId")REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateInfoGroupSessionMessage" ADD FOREIGN KEY("privateInfoContentId")REFERENCES "PrivateInfoContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD FOREIGN KEY("userId")REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD FOREIGN KEY("contactUserId")REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInvitation" ADD FOREIGN KEY("userId")REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD FOREIGN KEY("deviceId")REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD FOREIGN KEY("repositoryId")REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSessionMessage" ADD FOREIGN KEY("contentId")REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repository" ADD FOREIGN KEY("creatorId")REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD FOREIGN KEY("billingAccountId")REFERENCES "BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD FOREIGN KEY("userId")REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAccountAuthToken" ADD FOREIGN KEY("billingAccountId")REFERENCES "BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RepositoryToUser" ADD FOREIGN KEY("A")REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RepositoryToUser" ADD FOREIGN KEY("B")REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RepositoryEventsToUser" ADD FOREIGN KEY("A")REFERENCES "RepositoryEvents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RepositoryEventsToUser" ADD FOREIGN KEY("B")REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
