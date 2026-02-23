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

    const existingService = await prisma.service.findFirst({
      where: { id, siteId },
    });
    if (!existingService) {
      throw new ApiRouteError("Service not found in active site", 404);
    }

    let deviceId = existingService.deviceId;
    if (body.deviceId && body.deviceId !== existingService.deviceId) {
      const device = await prisma.device.findFirst({
        where: { id: String(body.deviceId), siteId },
      });
      if (!device) {
        throw new ApiRouteError("Device not found in active site", 404);
      }
      deviceId = device.id;
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        name: body.name,
        deviceId,
        protocol: body.protocol,
        ports: body.ports,
        description: body.description,
        url: body.url,
        environment: body.environment,
        isDocker: body.isDocker,
        dockerImage: body.dockerImage,
        dockerCompose: body.dockerCompose,
        stackName: body.stackName,
        healthStatus: body.healthStatus,
        version: body.version,
        dependencies: body.dependencies,
        tags: body.tags,
        healthCheckEnabled: body.healthCheckEnabled,
      },
      include: { device: true },
    });
    await prisma.changeLog.create({
      data: {
        objectType: "Service",
        objectId: id,
        action: "update",
        changes: JSON.stringify(body),
        siteId,
      },
    });
    return NextResponse.json(service);
  } catch (error) {
    return handleApiError(error, "Failed to update service");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { siteId } = await requireActiveSiteContext();
    const { id } = await params;
    const service = await prisma.service.findFirst({ where: { id, siteId } });
    if (!service) {
      throw new ApiRouteError("Service not found in active site", 404);
    }
    await prisma.service.delete({ where: { id } });
    await prisma.changeLog.create({
      data: {
        objectType: "Service",
        objectId: id,
        action: "delete",
        changes: JSON.stringify({ name: service.name, ports: service.ports }),
        siteId,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to delete service");
  }
}
