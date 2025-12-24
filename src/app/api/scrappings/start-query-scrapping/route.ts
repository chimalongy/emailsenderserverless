import type { scrapeEmailsTask } from "../../../../trigger/scrapeEmailsTask";
import { configure, tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
);

/* ----------------------------------
   Helpers
----------------------------------- */
function parseQuery(q: string) {
  const lower = q.toLowerCase().trim();
  if (!lower.includes(" in ")) return { query: lower, city: "" };
  const [query, city] = lower.split(" in ").map((s) => s.trim());
  return { query, city };
}

async function getLinksFromGoogle(query: string) {
  try {
    const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        key: process.env.GOOGLE_SEARCH_API_KEY,
        cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
        q: query,
        num: 10, // max 10 results per query
      },
    });

    const items = res.data.items || [];
    // Filter out Google internal links, directories, etc.
    return items
      .map((i: any) => i.link)
      .filter(
        (url: string) =>
          url &&
          !url.includes("google.com") &&
          !url.includes("youtube.com") &&
          !url.includes("facebook.com")
      );
  } catch (err: any) {
    console.error(`Google search failed for "${query}":`, err.response?.data || err.message);
    return [];
  }
}

/* ----------------------------------
   POST
----------------------------------- */
export async function POST(req: Request) {
  try {
    const { scrapping } = await req.json();
    const { id, user_id, queries } = scrapping;

    console.log("Scrapping request received:", scrapping);

    if (!id || !user_id || !Array.isArray(queries)) {
      return NextResponse.json(
        { error: "Invalid scrapping payload" },
        { status: 400 }
      );
    }

    let allUrls: string[] = [];

    for (const q of queries) {
      const { query, city } = parseQuery(q);
      const fullQuery = city ? `${query} in ${city}` : query;

      if (!query) {
        console.warn(`Skipping invalid query: "${q}"`);
        continue;
      }

      try {
        const urls = await getLinksFromGoogle(fullQuery);
        allUrls.push(...urls);
      } catch (err) {
        console.error(`Google request failed for "${fullQuery}":`, err);
      }
    }

    allUrls = [...new Set(allUrls)]; // deduplicate
    console.log("Resolved URLs:", allUrls);

    if (allUrls.length === 0) {
      return NextResponse.json(
        { error: "No websites found from search queries" },
        { status: 404 }
      );
    }

    // ✅ Save resolved URLs to Supabase before triggering scraper
    await supabase
      .from("scrappings")
      .update({
        urls: allUrls,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    // 🚀 Trigger scraping task
    const handle = await tasks.trigger<typeof scrapeEmailsTask>(
      "scrape-emails-task",
      {
        scrappingId: id,
        userId: user_id,
        urls: allUrls,
      }
    );

    return NextResponse.json({
      success: true,
      totalUrls: allUrls.length,
      runId: handle.id,
    });
  } catch (err) {
    console.error("query-search error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
