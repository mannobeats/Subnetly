-- AlterTable: Add enhanced fields to Service
ALTER TABLE "Service" ADD COLUMN "url" TEXT;
ALTER TABLE "Service" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'production';
ALTER TABLE "Service" ADD COLUMN "isDocker" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Service" ADD COLUMN "dockerImage" TEXT;
ALTER TABLE "Service" ADD COLUMN "dockerCompose" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Service" ADD COLUMN "stackName" TEXT;
ALTER TABLE "Service" ADD COLUMN "healthStatus" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "Service" ADD COLUMN "version" TEXT;
ALTER TABLE "Service" ADD COLUMN "dependencies" TEXT;
ALTER TABLE "Service" ADD COLUMN "tags" TEXT;
