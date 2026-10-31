import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "panelforge_session";
export type AuthUser = { sub: string; email: string; name: string; picture?: string };

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be set to a random value of at least 32 characters.");
  return value;
}

export function signSession(user: AuthUser) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return payload + "." + signature;
}

export function readSession(request: NextRequest): AuthUser | null {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const expected = createHmac("sha256", secret()).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.sub || !data.email || !data.exp || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return { sub: data.sub, email: data.email, name: data.name || data.email, picture: data.picture };
  } catch {
    return null;
  }
}

export function authConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.AUTH_SECRET);
}
