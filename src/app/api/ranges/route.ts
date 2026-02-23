import { NextResponse } from "next/server";
import {
  ApiRouteError,
  handleApiError,
  requireActiveSiteContext,
} from "@/lib/api-guard";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { siteId } = await requireActiveSiteContext();
    const body = await request.json();
    const subnetId = body.subnetId ? String(body.subnetId) : null;
    if (!subnetId) {
      throw new ApiRouteError("subnetId is required", 400);
    }

    const subnet = await prisma.subnet.findFirst({
      where: { id: subnetId, siteId },
    });
    if (!subnet) {
      throw new ApiRouteError("Subnet not found in active site", 404);
    }

    const range = await prisma.iPRange.create({
      data: {
        startAddr: body.startAddr,
        endAddr: body.endAddr,
        subnetId,
        role: body.role || "dhcp",
        description: body.description,
        status: body.status || "active",
      },
    });
    await prisma.changeLog.create({
      data: {
        objectType: "IPRange",
        objectId: range.id,
        action: "create",
        changes: JSON.stringify({
          startAddr: body.startAddr,
          endAddr: body.endAddr,
          role: body.role,
        }),
        siteId,
      },
    });
    return NextResponse.json(range);
  } catch (error) {
    return handleApiError(error, "Failed to create IP range");
  }
}
