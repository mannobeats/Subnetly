import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getActiveSite } from "@/lib/site-context";

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

export async function GET() {
  try {
    const { siteId } = await getActiveSite();
    if (!siteId) return NextResponse.json([], { status: 200 });

    const devices = await prisma.device.findMany({
      where: { siteId },
      orderBy: { ipAddress: "asc" },
    });
    return NextResponse.json(devices);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { siteId } = await getActiveSite();
    if (!siteId)
      return NextResponse.json({ error: "No active site" }, { status: 401 });

    const body = await request.json();
    const ipAddress = (body.ipAddress || "").trim();
    const device = await prisma.device.create({
      data: {
        name: (body.name || "").trim(),
        macAddress: (body.macAddress || "").trim(),
        ipAddress,
        category: body.category,
        status: body.status || "active",
        platform: body.platform || null,
        notes: body.notes || null,
        siteId,
      },
    });

    // Auto-link: find matching subnet and create IPAM record
    if (ipAddress) {
      const subnets = await prisma.subnet.findMany({ where: { siteId } });
      for (const subnet of subnets) {
        if (ipBelongsToSubnet(ipAddress, subnet.prefix, subnet.mask)) {
          const existing = await prisma.iPAddress.findFirst({
            where: { address: ipAddress, subnetId: subnet.id },
          });
          if (!existing) {
            await prisma.iPAddress.create({
              data: {
                address: ipAddress,
                mask: subnet.mask,
                subnetId: subnet.id,
                status: "active",
                dnsName: (body.name || "").trim(),
                assignedTo: (body.name || "").trim(),
                description: `Auto-linked to ${(body.name || "").trim()}`,
              },
            });
          }
          break;
        }
      }
    }

    await prisma.changeLog.create({
      data: {
        objectType: "Device",
        objectId: device.id,
        action: "create",
        changes: JSON.stringify({
          name: body.name,
          ipAddress: body.ipAddress,
          category: body.category,
          status: body.status,
        }),
        siteId,
      },
    });
    return NextResponse.json(device);
  } catch {
    return NextResponse.json(
      { error: "Failed to create device" },
      { status: 500 },
    );
  }
}
