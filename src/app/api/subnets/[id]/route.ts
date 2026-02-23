import { NextResponse } from "next/server";
import {
  ApiRouteError,
  handleApiError,
  requireActiveSiteContext,
} from "@/lib/api-guard";
import prisma from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { siteId } = await requireActiveSiteContext();
    const { id } = await params;
    const body = await request.json();

    const subnetExisting = await prisma.subnet.findFirst({
      where: { id, siteId },
    });
    if (!subnetExisting) {
      throw new ApiRouteError("Subnet not found in active site", 404);
    }

    let vlanId = body.vlanId;
    if (body.vlanId) {
      const vlan = await prisma.vLAN.findFirst({
        where: { id: String(body.vlanId), siteId },
      });
      if (!vlan) {
        throw new ApiRouteError("VLAN not found in active site", 404);
      }
      vlanId = vlan.id;
    } else if (body.vlanId === null || body.vlanId === "") {
      vlanId = null;
    }

    const subnet = await prisma.subnet.update({
      where: { id },
      data: {
        prefix: body.prefix ? body.prefix.trim() : undefined,
        mask: body.mask,
        description: body.description,
        vlanId,
        gateway: body.gateway ? body.gateway.trim() : body.gateway,
        status: body.status,
        role: body.role,
        isPool: body.isPool,
      },
      include: { vlan: true, site: true },
    });
    await prisma.changeLog.create({
      data: {
        objectType: "Subnet",
        objectId: subnet.id,
        action: "update",
        changes: JSON.stringify(body),
        siteId,
      },
    });
    return NextResponse.json(subnet);
  } catch (error) {
    return handleApiError(error, "Failed to update subnet");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { siteId } = await requireActiveSiteContext();
    const { id } = await params;

    const subnetExisting = await prisma.subnet.findFirst({
      where: { id, siteId },
    });
    if (!subnetExisting) {
      throw new ApiRouteError("Subnet not found in active site", 404);
    }

    // Clear device ipAddress for any IPs in this subnet before deleting
    const ipsInSubnet = await prisma.iPAddress.findMany({
      where: { subnetId: id },
      select: { address: true },
    });
    if (ipsInSubnet.length > 0) {
      await prisma.device.updateMany({
        where: {
          siteId,
          ipAddress: { in: ipsInSubnet.map((ip) => ip.address) },
        },
        data: { ipAddress: "" },
      });
    }

    await prisma.iPAddress.deleteMany({ where: { subnetId: id } });
    await prisma.iPRange.deleteMany({ where: { subnetId: id } });
    await prisma.changeLog.create({
      data: {
        objectType: "Subnet",
        objectId: id,
        action: "delete",
        changes: "{}",
        siteId,
      },
    });
    await prisma.subnet.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to delete subnet");
  }
}
