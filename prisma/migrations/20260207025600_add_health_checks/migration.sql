-- AlterTable: Add health check fields to Service
ALTER TABLE "Service" ADD COLUMN "healthCheckEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Service" ADD COLUMN "lastCheckedAt" TIMESTAMP(3);
ALTER TABLE "Service" ADD COLUMN "lastResponseTime" INTEGER;
ALTER TABLE "Service" ADD COLUMN "uptimePercent" DOUBLE PRECISION;
ALTER TABLE "Service" ADD COLUMN "checkCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN "successCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "healthCheckEnabled" BOOLEAN NOT NULL DEFAULT false,
    "healthCheckInterval" INTEGER NOT NULL DEFAULT 300,
    "healthCheckTimeout" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettings_siteId_key" ON "SiteSettings"("siteId");

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
