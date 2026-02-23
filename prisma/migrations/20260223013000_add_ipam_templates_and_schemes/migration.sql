-- CreateTable
CREATE TABLE "SubnetTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "mask" INTEGER NOT NULL,
    "gateway" TEXT,
    "role" TEXT,
    "description" TEXT,
    "siteId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubnetTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPRangeScheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "siteId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IPRangeScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPRangeSchemeEntry" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "startOctet" INTEGER NOT NULL,
    "endOctet" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IPRangeSchemeEntry_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "IPRange" ADD COLUMN "schemeEntryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SubnetTemplate_siteId_slug_key" ON "SubnetTemplate"("siteId", "slug");
CREATE INDEX "SubnetTemplate_siteId_idx" ON "SubnetTemplate"("siteId");
CREATE UNIQUE INDEX "IPRangeScheme_siteId_slug_key" ON "IPRangeScheme"("siteId", "slug");
CREATE INDEX "IPRangeScheme_siteId_idx" ON "IPRangeScheme"("siteId");
CREATE INDEX "IPRangeSchemeEntry_schemeId_idx" ON "IPRangeSchemeEntry"("schemeId");
CREATE INDEX "IPRange_schemeEntryId_idx" ON "IPRange"("schemeEntryId");

-- AddForeignKey
ALTER TABLE "SubnetTemplate" ADD CONSTRAINT "SubnetTemplate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IPRangeScheme" ADD CONSTRAINT "IPRangeScheme_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IPRangeSchemeEntry" ADD CONSTRAINT "IPRangeSchemeEntry_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "IPRangeScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IPRange" ADD CONSTRAINT "IPRange_schemeEntryId_fkey" FOREIGN KEY ("schemeEntryId") REFERENCES "IPRangeSchemeEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
