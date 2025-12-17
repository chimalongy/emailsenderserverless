import { NextResponse } from "next/server";



export async function POST(req) {
  try {
    const { scrapping } = await req.json();

    if (!scrapping) {
      return NextResponse.json(
        { error: "Missing scrapping data" },
        { status: 400 }
      );
    }

    const {
      id,
      user_id,
      method,
      queries,
      urls,
      name,
    } = scrapping;

    // 🔥 Trigger.dev cloud execution (runs once)
    // const handle = await client.trigger(scrapeEmailsTask, {
    //   scrappingId: id,
    //   userId: user_id,
    //   method,
    //   queries,
    //   urls,
    //   name,
    // });

    return NextResponse.json({
      success: true,
      message: "Scrapping job sent to Trigger.dev",
      scrappingId: id,
      runId: handle.id,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("Error in start-scrapping API:", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
