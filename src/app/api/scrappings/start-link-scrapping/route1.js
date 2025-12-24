import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";
import { scrapeEmailsTask } from "@/trigger/scrapeEmailsTask";

export async function POST(req) {
  try {
    const { scrapping } = await req.json();

    if (!scrapping) {
      return NextResponse.json(
        { error: "Missing scrapping data" },
        { status: 400 }
      );
    }

    const { id, user_id, method, queries, urls } = scrapping;

    // Only URL-based scraping for now
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "No URLs provided for scraping" },
        { status: 400 }
      );
    }


    let payload = {
      scrappingId: id,
      userId: user_id,
      urls,
    }
   // console.log(JSON.stringify(payload))
    // 🔥 Trigger task
    const handle = await client.trigger(scrapeEmailsTask, payload);

    return NextResponse.json({
      success: true,
      message: "Scrapping job started",
      scrappingId: id,
      runId: handle.id,
    });

  } catch (err) {
    console.error("start-scrapping error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
