import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
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

async function prepareReference(input: Buffer) {
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

async function fetchReference(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("A hosted character reference could not be downloaded.");
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) throw new Error("A character reference link did not return an image.");
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > 8_000_000) throw new Error("A character reference image is too large.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 8_000_000) throw new Error("A character reference image is too large.");
  return prepareReference(bytes);
}

export async function POST(request: NextRequest) {
  if (!rateLimit(request)) {
    return NextResponse.json({ error: "PanelForge's hourly safety limit has been reached. Please try again later." }, { status: 429 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    return NextResponse.json({
      error: "Cloudflare Workers AI is not connected. Check that CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are set in the Render environment.",
    }, { status: 503 });
  }

  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((url: unknown): url is string =>
          typeof url === "string" && /^https:\/\/i\.postimg\.cc\//.test(url)
        ).slice(0, 4)
      : [];

    if (imageBase64.length > 1_400_000) {
      return NextResponse.json({ error: "The reference image is too large after compression. Please choose another image." }, { status: 413 });
    }
    if (imageBase64 && !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
      return NextResponse.json({ error: "The reference image could not be read. Please upload it again." }, { status: 400 });
    }
    if (prompt.length < 3 || prompt.length > 50000) {
      return NextResponse.json({ error: "A valid image prompt is required." }, { status: 400 });
    }

    const form = new FormData();
    form.append("prompt", prompt);
    form.append("width", "768");
    form.append("height", "1024");
    form.append("guidance", "4");

    const references: Buffer[] = [];
    if (imageBase64) {
      references.push(await prepareReference(Buffer.from(imageBase64, "base64")));
    } else {
      for (const url of imageUrls.slice(0, 4)) references.push(await fetchReference(url));
    }
    references.slice(0, 4).forEach((image, index) => {
      form.append(`input_image_${index}`, new Blob([new Uint8Array(image)], { type: "image/jpeg" }), `reference-${index + 1}.jpg`);
    });

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${MODEL}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}` },
      body: form,
      signal: AbortSignal.timeout(110000),
    });

    const payload = await response.json().catch(() => null) as {
      success?: boolean;
      errors?: Array<{ message?: string; code?: number }>;
      result?: { image?: string };
    } | null;

    if (!response.ok || !payload?.success || !payload.result?.image) {
      const detail = payload?.errors?.map(error => error.message).filter(Boolean).join("; ") || "";
      const normalized = detail.toLowerCase();
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ error: "Cloudflare rejected the API token. Check the Workers AI permissions on CLOUDFLARE_API_TOKEN in Render." }, { status: 502 });
      }
      if (response.status === 429 || normalized.includes("daily") || normalized.includes("neurons") || normalized.includes("quota")) {
        return NextResponse.json({ error: "Cloudflare's free daily image-generation allowance has been used. It resets at 00:00 UTC; try again after the reset." }, { status: 429 });
      }
      return NextResponse.json({ error: detail || "Cloudflare could not generate this panel. Please try again." }, { status: 502 });
    }

    const image = payload.result.image.replace(/^data:image\/[^;]+;base64,/, "");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
      return NextResponse.json({ error: "Cloudflare returned an image in an unexpected format." }, { status: 502 });
    }

    return NextResponse.json({
      status: "COMPLETED",
      imageUrl: `data:image/jpeg;base64,${image}`,
      model: MODEL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate this panel.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
