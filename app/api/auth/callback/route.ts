import { NextRequest, NextResponse } from "next/server";
import { signSession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

function home(request: NextRequest, error?: string) {
  const url = new URL("/", request.url);
  if (error) url.searchParams.set("auth_error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("panelforge_oauth_state")?.value;
  if (!code || !state || !savedState || state !== savedState) return home(request, "invalid_state");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = (process.env.APP_URL || "https://panelforge-ai.onrender.com").replace(/\/$/, "");
  if (!clientId || !clientSecret || !process.env.AUTH_SECRET) return home(request, "setup_required");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: appUrl + "/api/auth/callback",
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return home(request, "google_token_exchange");
    const tokens = await tokenResponse.json() as { id_token?: string };
    if (!tokens.id_token) return home(request, "missing_identity");

    const verifyResponse = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(tokens.id_token), { cache: "no-store" });
    if (!verifyResponse.ok) return home(request, "identity_verification");
    const identity = await verifyResponse.json() as { aud?: string; iss?: string; exp?: string; sub?: string; email?: string; email_verified?: string; name?: string; picture?: string };
    if (identity.aud !== clientId || !["accounts.google.com", "https://accounts.google.com"].includes(identity.iss || "") ||
        !identity.sub || !identity.email || identity.email_verified !== "true" ||
        Number(identity.exp || 0) <= Math.floor(Date.now() / 1000)) return home(request, "identity_verification");

    const response = home(request);
    response.cookies.set(SESSION_COOKIE, signSession({
      sub: identity.sub,
      email: identity.email,
      name: identity.name || identity.email,
      picture: identity.picture,
    }), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    response.cookies.set("panelforge_oauth_state", "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch {
    return home(request, "sign_in_failed");
  }
}
