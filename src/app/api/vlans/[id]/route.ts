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

    const vlanExisting = await prisma.vLAN.findFirst({ where: { id, siteId } });
    if (!vlanExisting) {
      throw new ApiRouteError("VLAN not found in active site", 404);
    }

    const vlan = await prisma.vLAN.update({
      where: { id },
      data: {
        vid: body.vid,
        name: body.name,
        status: body.status,
        role: body.role,
        description: body.description,
      },
      include: { subnets: true },
    });
    await prisma.changeLog.create({
      data: {
        objectType: "VLAN",
        objectId: vlan.id,
        action: "update",
        changes: JSON.stringify(body),
        siteId,
      },
    });
    return NextResponse.json(vlan);
  } catch (error) {
    return handleApiError(error, "Failed to update VLAN");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { siteId } = await requireActiveSiteContext();
    const { id } = await params;

    const vlanExisting = await prisma.vLAN.findFirst({ where: { id, siteId } });
    if (!vlanExisting) {
      throw new ApiRouteError("VLAN not found in active site", 404);
    }

    await prisma.changeLog.create({
      data: {
        objectType: "VLAN",
        objectId: id,
        action: "delete",
        changes: "{}",
        siteId,
      },
    });
    await prisma.vLAN.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to delete VLAN");
  }
}
