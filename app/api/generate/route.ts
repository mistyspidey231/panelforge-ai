import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

const TEXT_ENDPOINT = "google/nano-banana-2.1";
const EDIT_ENDPOINT = "google/nano-banana-2.1/edit";
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const max = 12;
  const bucket = rateBuckets.get(forwarded);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(forwarded, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  if (!rateLimit(request)) {
    return NextResponse.json({ error: "Generation limit reached for this hour. Please try again later." }, { status: 429 });
  }

  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Image generation is not connected yet. Add the FAL_KEY environment variable to the PanelForge service on Render." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
    const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.startsWith("https://i.postimg.cc/") ? body.imageUrl : "";

    if (imageBase64.length > 1_400_000) {
      return NextResponse.json({ error: "The reference image is too large after compression. Please choose another image." }, { status: 413 });
    }
    if (imageBase64 && !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
      return NextResponse.json({ error: "The reference image could not be read. Please upload it again." }, { status: 400 });
    }
    if (prompt.length < 3 || prompt.length > 50000) {
      return NextResponse.json({ error: "A valid image prompt is required." }, { status: 400 });
    }

    fal.config({ credentials: apiKey });
    const endpoint = imageBase64 || imageUrl ? EDIT_ENDPOINT : TEXT_ENDPOINT;
    const input = {
      prompt,
      aspect_ratio: "3:4",
      resolution: "1K",
      output_format: "jpeg",
      num_images: 1,
      ...((imageBase64 || imageUrl) ? { image_urls: [imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : imageUrl] } : {}),
    };
    const result = await fal.subscribe(endpoint, { input });
    const imageUrl = result.data?.images?.[0]?.url;

    if (typeof imageUrl !== "string" || !imageUrl.startsWith("https://")) {
      return NextResponse.json({ error: "The image service finished without returning a usable image. Please try again." }, { status: 502 });
    }

    return NextResponse.json({
      status: "COMPLETED",
      imageUrl,
      description: result.data?.description || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate this panel.";
    const safeMessage = message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("invalid key")
      ? "The FAL_KEY on Render was rejected. Check that the correct fal.ai key is saved in the service environment."
      : message;
    return NextResponse.json({ error: safeMessage }, { status: 502 });
  }
}
