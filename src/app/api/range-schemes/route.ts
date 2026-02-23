import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getActiveSite } from "@/lib/site-context";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type EntryInput = {
  startOctet: number;
  endOctet: number;
  role?: string;
  description?: string | null;
};

export async function GET() {
  try {
    const { siteId } = await getActiveSite();
    if (!siteId)
      return NextResponse.json({ error: "No active site" }, { status: 401 });

    const schemes = await prisma.iPRangeScheme.findMany({
      where: { siteId },
      include: { entries: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(schemes);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch range schemes" },
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
    const name = (body.name || "").trim();
    if (!name)
      return NextResponse.json(
        { error: "Scheme name is required" },
        { status: 400 },
      );

    const entriesInput = Array.isArray(body.entries)
      ? (body.entries as EntryInput[])
      : [];
    if (entriesInput.length === 0) {
      return NextResponse.json(
        { error: "At least one scheme entry is required" },
        { status: 400 },
      );
    }

    const normalizedEntries = entriesInput.map((entry, idx) => ({
      startOctet: Math.max(1, Math.min(254, Number(entry.startOctet))),
      endOctet: Math.max(1, Math.min(254, Number(entry.endOctet))),
      role: (entry.role || "general").trim() || "general",
      description: entry.description ? String(entry.description).trim() : null,
      sortOrder: idx,
    }));

    for (const entry of normalizedEntries) {
      if (entry.startOctet > entry.endOctet) {
        return NextResponse.json(
          { error: "Each entry start octet must be <= end octet" },
          { status: 400 },
        );
      }
    }

    const slug = slugify(name);
    const duplicate = await prisma.iPRangeScheme.findUnique({
      where: { siteId_slug: { siteId, slug } },
    });
    if (duplicate)
      return NextResponse.json(
        { error: "Scheme already exists" },
        { status: 409 },
      );

    const maxOrder = await prisma.iPRangeScheme.findFirst({
      where: { siteId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const scheme = await prisma.iPRangeScheme.create({
      data: {
        siteId,
        name,
        slug,
        description: body.description ? String(body.description).trim() : null,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
        entries: {
          create: normalizedEntries,
        },
      },
      include: { entries: { orderBy: { sortOrder: "asc" } } },
    });

    await prisma.changeLog.create({
      data: {
        siteId,
        objectType: "IPRangeScheme",
        objectId: scheme.id,
        action: "create",
        changes: JSON.stringify({
          name: scheme.name,
          entries: scheme.entries.length,
        }),
      },
    });

    return NextResponse.json(scheme);
  } catch {
    return NextResponse.json(
      { error: "Failed to create range scheme" },
      { status: 500 },
    );
  }
}
