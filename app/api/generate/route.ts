import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

const ENDPOINT = "google/nano-banana-2.1";

function configureFal() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("Image generation is not configured yet. Add FAL_KEY to the PanelForge server environment.");
  fal.config({ credentials: key });
}

export async function POST(request: NextRequest) {
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
  try {
    configureFal();
    const requestId = request.nextUrl.searchParams.get("requestId");
    if (!requestId || !/^[\\w-]{1,128}$/.test(requestId)) {
      return NextResponse.json({ error: "A valid generation request ID is required." }, { status: 400 });
    }
    const status = await fal.queue.status(ENDPOINT, { requestId });
    if (status.status !== "COMPLETED") {
      return NextResponse.json({ status: status.status });
    }
    if ((status as any).error) {
      return NextResponse.json({ status: "FAILED", error: (status as any).error }, { status: 502 });
    }
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
