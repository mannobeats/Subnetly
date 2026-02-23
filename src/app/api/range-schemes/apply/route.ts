import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getActiveSite } from "@/lib/site-context";

function subnetBase(prefix: string): string {
  return prefix.split(".").slice(0, 3).join(".");
}

export async function POST(request: Request) {
  try {
    const { siteId } = await getActiveSite();
    if (!siteId)
      return NextResponse.json({ error: "No active site" }, { status: 401 });

    const body = await request.json();
    const subnetId = String(body.subnetId || "");
    const schemeId = String(body.schemeId || "");
    const replaceExisting = !!body.replaceExisting;

    if (!subnetId || !schemeId) {
      return NextResponse.json(
        { error: "subnetId and schemeId are required" },
        { status: 400 },
      );
    }

    const subnet = await prisma.subnet.findFirst({
      where: { id: subnetId, siteId },
    });
    if (!subnet)
      return NextResponse.json({ error: "Subnet not found" }, { status: 404 });

    const scheme = await prisma.iPRangeScheme.findFirst({
      where: { id: schemeId, siteId },
      include: { entries: { orderBy: { sortOrder: "asc" } } },
    });
    if (!scheme)
      return NextResponse.json({ error: "Scheme not found" }, { status: 404 });

    const base = subnetBase(subnet.prefix);

    await prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        await tx.iPRange.deleteMany({ where: { subnetId } });
      }

      for (const entry of scheme.entries) {
        await tx.iPRange.create({
          data: {
            subnetId,
            startAddr: `${base}.${entry.startOctet}`,
            endAddr: `${base}.${entry.endOctet}`,
            role: entry.role,
            description: entry.description,
            status: "active",
            schemeEntryId: entry.id,
          },
        });
      }
    });

    await prisma.changeLog.create({
      data: {
        siteId,
        objectType: "IPRangeScheme",
        objectId: scheme.id,
        action: "create",
        changes: JSON.stringify({
          type: "apply",
          subnetId,
          replaceExisting,
          entries: scheme.entries.length,
        }),
      },
    });

    return NextResponse.json({ success: true, applied: scheme.entries.length });
  } catch {
    return NextResponse.json(
      { error: "Failed to apply range scheme" },
      { status: 500 },
    );
  }
}
