-- CreateTable
CREATE TABLE "DeviceTombstone" (
    "id" TEXT NOT NULL,
    "idKey" TEXT NOT NULL,
    "signingKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTombstone" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceTombstone.idKey_unique" ON "DeviceTombstone"("idKey");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceTombstone.signingKey_unique" ON "DeviceTombstone"("signingKey");
