import type { scrapeEmailsTask } from "../../../../trigger/scrapeEmailsTask";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";

// Optional: enable edge runtime
// export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { scrapping } = await req.json();

    if (!scrapping) {
      return NextResponse.json(
        { error: "Missing scrapping data" },
        { status: 400 }
      );
    }

    const { id, user_id, urls } = scrapping;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "No URLs provided for scraping" },
        { status: 400 }
      );
    }

    const payload = {
      scrappingId: id,
      userId: user_id,
      urls,
    };

    // ✅ Trigger the task with type-safe payload
    const handle = await tasks.trigger<typeof scrapeEmailsTask>(
      "scrape-emails-task", // task ID
      payload
    );

    return NextResponse.json({
      success: true,
      message: "Scraping job started",
      scrappingId: id,
      runId: handle.id,
    });
  } catch (err) {
    console.error("start-scraping error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
