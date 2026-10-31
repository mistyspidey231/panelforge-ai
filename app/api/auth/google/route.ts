import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET || !process.env.AUTH_SECRET) {
    return NextResponse.redirect(new URL("/?auth_error=setup_required", "https://panelforge-ai.onrender.com"));
  }
  const state = randomBytes(32).toString("base64url");
  const base = process.env.APP_URL || "https://panelforge-ai.onrender.com";
  const redirectUri = base.replace(/\/$/, "") + "/api/auth/callback";
  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.searchParams.set("client_id", clientId);
  google.searchParams.set("redirect_uri", redirectUri);
  google.searchParams.set("response_type", "code");
  google.searchParams.set("scope", "openid email profile");
  google.searchParams.set("state", state);
  google.searchParams.set("prompt", "select_account");
  const response = NextResponse.redirect(google);
  response.cookies.set("panelforge_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}
