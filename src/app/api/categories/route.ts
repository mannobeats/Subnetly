import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getActiveSite } from "@/lib/site-context";

export async function GET(request: Request) {
  try {
    const { siteId } = await getActiveSite();
    if (!siteId)
      return NextResponse.json({ error: "No active site" }, { status: 401 });

    const url = new URL(request.url);
    const type = url.searchParams.get("type") || undefined;

    const categories = await prisma.customCategory.findMany({
      where: { siteId, ...(type ? { type } : {}) },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(categories);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch categories" },
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
      return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const type = body.type || "device";

    // Check for duplicate within site+type
    const existing = await prisma.customCategory.findUnique({
      where: { siteId_type_slug: { siteId, type, slug } },
    });
    if (existing)
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 },
      );

    // Get max sort order for this type
    const maxOrder = await prisma.customCategory.findFirst({
      where: { siteId, type },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const category = await prisma.customCategory.create({
      data: {
        name,
        slug,
        type,
        icon: body.icon || "server",
        color: body.color || "#5e6670",
        siteId,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(category);
  } catch {
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
