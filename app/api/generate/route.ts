import { NextRequest, NextResponse } from "next/server";

const MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
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

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    return NextResponse.json({ error: "Free image generation is not connected yet. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to the server environment." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
    if (imageBase64.length > 2_100_000) {
      return NextResponse.json({ error: "Reference image is too large. Please upload an image smaller than 1.5 MB." }, { status: 413 });
    }
    if (imageBase64 && !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
      return NextResponse.json({ error: "The reference image could not be read. Please upload it again." }, { status: 400 });
    }
    if (prompt.length < 3 || prompt.length > 50000) {
      return NextResponse.json({ error: "A valid image prompt is required." }, { status: 400 });
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          width: 768,
          height: 1024,
          num_steps: 8,
          ...(imageBase64 ? { image_b64: imageBase64, strength: 0.55 } : {}),
        }),
        cache: "no-store",
      }
    );

    const result = await response.json();
    const encodedImage = result?.result?.image;
    if (!response.ok || result?.success === false || typeof encodedImage !== "string") {
      const providerMessage = result?.errors?.[0]?.message;
      return NextResponse.json(
        { error: providerMessage || "Cloudflare could not generate this panel. Please try again." },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502 }
      );
    }

    return NextResponse.json({
      status: "COMPLETED",
      imageUrl: `data:image/jpeg;base64,${encodedImage}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate this panel.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
