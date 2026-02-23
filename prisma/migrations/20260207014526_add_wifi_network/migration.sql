-- CreateTable
CREATE TABLE "WifiNetwork" (
    "id" TEXT NOT NULL,
    "ssid" TEXT NOT NULL,
    "security" TEXT NOT NULL DEFAULT 'wpa2-personal',
    "passphrase" TEXT,
    "band" TEXT NOT NULL DEFAULT 'both',
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "vlanId" TEXT,
    "subnetId" TEXT,
    "siteId" TEXT,
    "guestNetwork" BOOLEAN NOT NULL DEFAULT false,
    "clientIsolation" BOOLEAN NOT NULL DEFAULT false,
    "bandSteering" BOOLEAN NOT NULL DEFAULT true,
    "pmf" TEXT NOT NULL DEFAULT 'optional',
    "txPower" TEXT NOT NULL DEFAULT 'auto',
    "minRate" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WifiNetwork_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WifiNetwork" ADD CONSTRAINT "WifiNetwork_vlanId_fkey" FOREIGN KEY ("vlanId") REFERENCES "VLAN"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiNetwork" ADD CONSTRAINT "WifiNetwork_subnetId_fkey" FOREIGN KEY ("subnetId") REFERENCES "Subnet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiNetwork" ADD CONSTRAINT "WifiNetwork_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
