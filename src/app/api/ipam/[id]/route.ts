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

    const existingIp = await prisma.iPAddress.findFirst({
      where: { id, subnet: { siteId } },
      include: { subnet: true },
    });
    if (!existingIp) {
      throw new ApiRouteError("IP address not found in active site", 404);
    }

    let subnetId = existingIp.subnetId;
    if (body.subnetId && body.subnetId !== existingIp.subnetId) {
      const subnet = await prisma.subnet.findFirst({
        where: { id: String(body.subnetId), siteId },
      });
      if (!subnet) {
        throw new ApiRouteError("Target subnet not found in active site", 404);
      }
      subnetId = subnet.id;
    }

    const ip = await prisma.iPAddress.update({
      where: { id },
      data: {
        address: body.address,
        mask: body.mask,
        subnetId,
        status: body.status,
        dnsName: body.dnsName,
        description: body.description,
        assignedTo: body.assignedTo,
      },
      include: { subnet: true },
    });
    await prisma.changeLog.create({
      data: {
        objectType: "IPAddress",
        objectId: id,
        action: "update",
        changes: JSON.stringify(body),
        siteId,
      },
    });
    return NextResponse.json(ip);
  } catch (error) {
    return handleApiError(error, "Failed to update IP address");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { siteId } = await requireActiveSiteContext();
    const { id } = await params;
    const ip = await prisma.iPAddress.findFirst({
      where: { id, subnet: { siteId } },
    });
    if (!ip)
      return NextResponse.json({ error: "IP not found" }, { status: 404 });

    // Clear ipAddress on any device that was linked to this IP
    await prisma.device.updateMany({
      where: { ipAddress: ip.address },
      data: { ipAddress: "" },
    });

    await prisma.iPAddress.delete({ where: { id } });
    await prisma.changeLog.create({
      data: {
        objectType: "IPAddress",
        objectId: id,
        action: "delete",
        changes: JSON.stringify({ address: ip.address, dnsName: ip.dnsName }),
        siteId,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to delete IP address");
  }
}
