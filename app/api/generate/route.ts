import { createHash, timingSafeEqual } from "node:crypto";
import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

const ENDPOINT = "google/nano-banana-2.1";
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function configureFal() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("Image generation is not configured yet. Add FAL_KEY to the PanelForge server environment.");
  fal.config({ credentials: key });
}

function authorized(request: NextRequest) {
  const expected = process.env.PANELFORGE_GENERATION_PASSWORD;
  const supplied = request.headers.get("x-generation-password") || "";
  if (!expected || !supplied) return false;
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

function rateLimit(request: NextRequest, action: "submit" | "poll") {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = action + ":" + forwarded;
  const now = Date.now();
  const windowMs = action === "submit" ? 60 * 60 * 1000 : 10 * 60 * 1000;
  const max = action === "submit" ? 12 : 180;
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Enter the correct generation password." }, { status: 401 });
  if (!rateLimit(request, "submit")) return NextResponse.json({ error: "Generation limit reached for this hour. Please try again later." }, { status: 429 });
  try {
    configureFal();
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (prompt.length < 3 || prompt.length > 50000) {
      return NextResponse.json({ error: "A valid image prompt is required." }, { status: 400 });
    }
    const queued = await fal.queue.submit(ENDPOINT, {
      input: {
        prompt,
        num_images: 1,
        aspect_ratio: "9:16",
        output_format: "png",
        resolution: "1K",
        thinking_level: "medium",
        enable_web_search: false,
      },
    });
    return NextResponse.json({ requestId: queued.request_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start image generation.";
    return NextResponse.json({ error: message }, { status: message.includes("FAL_KEY") ? 503 : 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Enter the correct generation password." }, { status: 401 });
  if (!rateLimit(request, "poll")) return NextResponse.json({ error: "Too many status checks. Please wait a moment." }, { status: 429 });
  try {
    configureFal();
    const requestId = request.nextUrl.searchParams.get("requestId");
    if (!requestId || !/^[\\w-]{1,128}$/.test(requestId)) {
      return NextResponse.json({ error: "A valid generation request ID is required." }, { status: 400 });
    }
    const status = await fal.queue.status(ENDPOINT, { requestId });
    if (status.status !== "COMPLETED") return NextResponse.json({ status: status.status });
    const result = await fal.queue.result(ENDPOINT, { requestId });
    const data = (result as any).data ?? result;
    const imageUrl = data?.images?.[0]?.url;
    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ error: "The image provider completed without returning an image." }, { status: 502 });
    }
    return NextResponse.json({ status: "COMPLETED", imageUrl, description: data.description ?? "" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check image generation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
