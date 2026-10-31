import { NextRequest, NextResponse } from "next/server";
import { authConfigured, readSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return NextResponse.json({ configured: authConfigured(), user: readSession(request) });
}
