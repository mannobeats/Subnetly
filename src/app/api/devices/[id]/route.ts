import { NextResponse } from "next/server";
import {
  ApiRouteError,
  handleApiError,
  requireActiveSiteContext,
} from "@/lib/api-guard";
import prisma from "@/lib/db";

function ipToInt(ip: string): number {
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

function ipBelongsToSubnet(ip: string, prefix: string, mask: number): boolean {
  const ipInt = ipToInt(ip);
  const prefixInt = ipToInt(prefix);
  const maskBits = (0xffffffff << (32 - mask)) >>> 0;
  return (ipInt & maskBits) === (prefixInt & maskBits);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { siteId } = await requireActiveSiteContext();
    const { id } = await params;
    const body = await request.json();
    const oldDevice = await prisma.device.findFirst({ where: { id, siteId } });
    if (!oldDevice) {
      throw new ApiRouteError("Device not found in active site", 404);
    }

    const cleanBody = {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      macAddress:
        body.macAddress !== undefined
          ? String(body.macAddress).trim()
          : undefined,
      ipAddress:
        body.ipAddress !== undefined
          ? String(body.ipAddress).trim()
          : undefined,
      category: body.category,
      status: body.status,
      serial: body.serial,
      assetTag: body.assetTag,
      notes: body.notes,
      rackId: body.rackId,
      rackPosition: body.rackPosition,
      deviceTypeId: body.deviceTypeId,
      platform: body.platform,
    };

    const device = await prisma.device.update({
      where: { id },
      data: cleanBody,
    });

    // Auto-link: if IP changed, update IPAM records
    if (
      "ipAddress" in cleanBody &&
      oldDevice &&
      cleanBody.ipAddress !== oldDevice.ipAddress
    ) {
      // Clear assignedTo on old IPAM record when IP changes or is removed
      if (oldDevice.ipAddress) {
        await prisma.iPAddress.updateMany({
          where: { address: oldDevice.ipAddress, assignedTo: oldDevice.name },
          data: { assignedTo: null, description: null },
        });
      }

      // Create new IPAM record for the new IP if it doesn't exist
      if (cleanBody.ipAddress) {
        const siteId = device.siteId;
        if (siteId) {
          const subnets = await prisma.subnet.findMany({ where: { siteId } });
          for (const subnet of subnets) {
            if (
              ipBelongsToSubnet(cleanBody.ipAddress, subnet.prefix, subnet.mask)
            ) {
              const existing = await prisma.iPAddress.findFirst({
                where: { address: cleanBody.ipAddress, subnetId: subnet.id },
              });
              if (!existing) {
                await prisma.iPAddress.create({
                  data: {
                    address: cleanBody.ipAddress,
                    mask: subnet.mask,
                    subnetId: subnet.id,
                    status: "active",
                    dnsName: device.name,
                    assignedTo: device.name,
                    description: `Auto-linked to ${device.name}`,
                  },
                });
              } else {
                // Update existing IPAM record to link to this device
                await prisma.iPAddress.update({
                  where: { id: existing.id },
                  data: { assignedTo: device.name, dnsName: device.name },
                });
              }
              break;
            }
          }
        }
      }
    }

    await prisma.changeLog.create({
      data: {
        objectType: "Device",
        objectId: id,
        action: "update",
        changes: JSON.stringify(body),
        siteId,
      },
    });
    return NextResponse.json(device);
  } catch (error) {
    return handleApiError(error, "Failed to update device");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { siteId } = await requireActiveSiteContext();
    const { id } = await params;
    const device = await prisma.device.findFirst({ where: { id, siteId } });
    if (!device) {
      throw new ApiRouteError("Device not found in active site", 404);
    }

    // Clear assignedTo on any IPAM record linked to this device's IP
    if (device?.ipAddress) {
      await prisma.iPAddress.updateMany({
        where: { address: device.ipAddress, assignedTo: device.name },
        data: { assignedTo: null, description: null },
      });
    }

    await prisma.device.delete({
      where: { id },
    });
    await prisma.changeLog.create({
      data: {
        objectType: "Device",
        objectId: id,
        action: "delete",
        changes: JSON.stringify({
          name: device.name,
          ipAddress: device.ipAddress,
        }),
        siteId,
      },
    });
    return NextResponse.json({ message: "Device deleted" });
  } catch (error) {
    return handleApiError(error, "Failed to delete device");
  }
}
