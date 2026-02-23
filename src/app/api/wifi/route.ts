import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getActiveSite } from "@/lib/site-context";

export async function GET() {
  try {
    const { siteId } = await getActiveSite();
    if (!siteId) return NextResponse.json([], { status: 200 });

    const networks = await prisma.wifiNetwork.findMany({
      where: { siteId },
      include: {
        vlan: { select: { id: true, vid: true, name: true, role: true } },
        subnet: {
          select: {
            id: true,
            prefix: true,
            mask: true,
            description: true,
            gateway: true,
          },
        },
      },
      orderBy: { ssid: "asc" },
    });
    return NextResponse.json(networks);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch WiFi networks" },
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
    const network = await prisma.wifiNetwork.create({
      data: {
        ssid: body.ssid,
        security: body.security || "wpa2-personal",
        passphrase: body.passphrase || null,
        band: body.band || "both",
        hidden: body.hidden || false,
        enabled: body.enabled !== false,
        vlanId: body.vlanId || null,
        subnetId: body.subnetId || null,
        siteId,
        guestNetwork: body.guestNetwork || false,
        clientIsolation: body.clientIsolation || false,
        bandSteering: body.bandSteering !== false,
        pmf: body.pmf || "optional",
        txPower: body.txPower || "auto",
        minRate: body.minRate || null,
        description: body.description || null,
      },
      include: {
        vlan: { select: { id: true, vid: true, name: true } },
        subnet: { select: { id: true, prefix: true, mask: true } },
      },
    });
    await prisma.changeLog.create({
      data: {
        objectType: "WifiNetwork",
        objectId: network.id,
        action: "create",
        changes: JSON.stringify(body),
        siteId,
      },
    });
    return NextResponse.json(network);
  } catch {
    return NextResponse.json(
      { error: "Failed to create WiFi network" },
      { status: 500 },
    );
  }
}
