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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { siteId } = await getActiveSite();
    if (!siteId)
      return NextResponse.json({ error: "No active site" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.iPRangeScheme.findFirst({
      where: { id, siteId },
      include: { entries: true },
    });
    if (!existing)
      return NextResponse.json({ error: "Scheme not found" }, { status: 404 });

    const hasEntriesUpdate = Array.isArray(body.entries);
    const entriesInput = hasEntriesUpdate
      ? (body.entries as EntryInput[])
      : null;

    if (entriesInput && entriesInput.length === 0) {
      return NextResponse.json(
        { error: "At least one scheme entry is required" },
        { status: 400 },
      );
    }

    const normalizedEntries = entriesInput?.map((entry, idx) => ({
      startOctet: Math.max(1, Math.min(254, Number(entry.startOctet))),
      endOctet: Math.max(1, Math.min(254, Number(entry.endOctet))),
      role: (entry.role || "general").trim() || "general",
      description: entry.description ? String(entry.description).trim() : null,
      sortOrder: idx,
    }));

    if (normalizedEntries) {
      for (const entry of normalizedEntries) {
        if (entry.startOctet > entry.endOctet) {
          return NextResponse.json(
            { error: "Each entry start octet must be <= end octet" },
            { status: 400 },
          );
        }
      }
    }

    let slug: string | undefined;
    if (body.name !== undefined) {
      slug = slugify(body.name || "");
      const duplicate = await prisma.iPRangeScheme.findFirst({
        where: { siteId, slug, NOT: { id } },
      });
      if (duplicate)
        return NextResponse.json(
          { error: "Scheme name already in use" },
          { status: 409 },
        );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const scheme = await tx.iPRangeScheme.update({
        where: { id },
        data: {
          name: body.name !== undefined ? String(body.name).trim() : undefined,
          slug,
          description:
            body.description !== undefined
              ? body.description
                ? String(body.description).trim()
                : null
              : undefined,
          sortOrder:
            body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        },
      });

      if (normalizedEntries) {
        const priorEntryIds = existing.entries.map((entry) => entry.id);

        await tx.iPRange.updateMany({
          where: { schemeEntryId: { in: priorEntryIds } },
          data: { schemeEntryId: null },
        });

        await tx.iPRangeSchemeEntry.deleteMany({ where: { schemeId: id } });
        await tx.iPRangeSchemeEntry.createMany({
          data: normalizedEntries.map((entry) => ({ ...entry, schemeId: id })),
        });
      }

      return tx.iPRangeScheme.findUnique({
        where: { id: scheme.id },
        include: { entries: { orderBy: { sortOrder: "asc" } } },
      });
    });

    await prisma.changeLog.create({
      data: {
        siteId,
        objectType: "IPRangeScheme",
        objectId: id,
        action: "update",
        changes: JSON.stringify(body),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update range scheme" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { siteId } = await getActiveSite();
    if (!siteId)
      return NextResponse.json({ error: "No active site" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.iPRangeScheme.findFirst({
      where: { id, siteId },
      include: { entries: true },
    });
    if (!existing)
      return NextResponse.json({ error: "Scheme not found" }, { status: 404 });

    const entryIds = existing.entries.map((entry) => entry.id);

    await prisma.$transaction(async (tx) => {
      if (entryIds.length > 0) {
        await tx.iPRange.updateMany({
          where: { schemeEntryId: { in: entryIds } },
          data: { schemeEntryId: null },
        });
      }
      await tx.iPRangeScheme.delete({ where: { id } });
    });

    await prisma.changeLog.create({
      data: {
        siteId,
        objectType: "IPRangeScheme",
        objectId: id,
        action: "delete",
        changes: JSON.stringify({ name: existing.name }),
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete range scheme" },
      { status: 500 },
    );
  }
}
