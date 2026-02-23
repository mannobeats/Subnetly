import { NextResponse } from "next/server";
import { getActiveSite } from "@/lib/site-context";

export class ApiRouteError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requireActiveSiteContext() {
  const context = await getActiveSite();
  if (!context.siteId) {
    throw new ApiRouteError("No active site", 401);
  }
  return context;
}

export function handleApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiRouteError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error(fallbackMessage, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
