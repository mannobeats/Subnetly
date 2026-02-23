import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const site = await prisma.site.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!site)
      return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const updated = await prisma.site.update({
      where: { id },
      data: {
        name: body.name !== undefined ? (body.name || "").trim() : undefined,
        description:
          body.description !== undefined ? body.description : undefined,
        address: body.address !== undefined ? body.address : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update site" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const site = await prisma.site.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!site)
      return NextResponse.json({ error: "Site not found" }, { status: 404 });

    // Don't allow deleting the last site
    const count = await prisma.site.count({
      where: { userId: session.user.id },
    });
    if (count <= 1)
      return NextResponse.json(
        { error: "Cannot delete your only site" },
        { status: 400 },
      );

    await prisma.site.delete({ where: { id } });

    // If this was the active site, switch to another
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeSiteId: true },
    });
    if (user?.activeSiteId === id) {
      const next = await prisma.site.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { activeSiteId: next.id },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete site" },
      { status: 500 },
    );
  }
}
