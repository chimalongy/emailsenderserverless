import type { scrapeEmailsTask } from "../../../../trigger/scrapeEmailsTask";
import { configure, tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

/* ----------------------------------
   Trigger.dev
----------------------------------- */
configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

/* ----------------------------------
   Supabase (server-side)
----------------------------------- */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ----------------------------------
   Axios instance (IMPORTANT)
----------------------------------- */
const USER_AGENT =
  "EmailSenderBot/1.0 (contact: chima@gmail.com)"; // 🔴 MUST be a REAL email

const AXIOS = axios.create({
  timeout: 30000,
  headers: {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  },
});

/* ----------------------------------
   1️⃣ Geocode city → lat/lon (Nominatim)
----------------------------------- */
async function geocodeLocation(
  location: string
): Promise<{ lat: number; lon: number } | null> {
  // ⏳ REQUIRED delay (Nominatim policy)
  await new Promise((r) => setTimeout(r, 1100));

  try {
    const res = await AXIOS.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: location,
          format: "json",
          limit: 1,
        },
      }
    );

    if (!Array.isArray(res.data) || res.data.length === 0) {
      return null;
    }

    return {
      lat: Number(res.data[0].lat),
      lon: Number(res.data[0].lon),
    };
  } catch (err: any) {
    console.error(
      "Nominatim error:",
      err.response?.status,
      err.response?.data || err.message
    );
    return null;
  }
}

/* ----------------------------------
   2️⃣ Overpass: fetch business websites
----------------------------------- */
async function getBusinessWebsitesFromOSM(
  keyword: string,
  location: string
): Promise<string[]> {
  const geo = await geocodeLocation(location);
  if (!geo) return [];

  const { lat, lon } = geo;

  const overpassQuery = `
[out:json][timeout:25];
(
  node["amenity"](around:25000,${lat},${lon});
  way["amenity"](around:25000,${lat},${lon});

  node["shop"](around:25000,${lat},${lon});
  way["shop"](around:25000,${lat},${lon});

  node["office"](around:25000,${lat},${lon});
  way["office"](around:25000,${lat},${lon});
);
out tags;
`;

  try {
    const res = await AXIOS.post(
      "https://overpass-api.de/api/interpreter",
      overpassQuery,
      { headers: { "Content-Type": "text/plain" } }
    );

    const websites: string[] = (res.data?.elements ?? [])
      .map((el: any) => el?.tags?.website || el?.tags?.["contact:website"])
      .filter((url): url is string => typeof url === "string")
      .map((url) => url.trim())
      .filter((url) => url.startsWith("http"));

    return Array.from(new Set<string>(websites));
  } catch (err: any) {
    console.error(
      "Overpass error:",
      err.response?.status,
      err.response?.data || err.message
    );
    return [];
  }
}

/* ----------------------------------
   POST /api/scrappings/start-query-scrapping
----------------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const scrapping = body?.scrapping as {
      id: string;
      user_id: string;
      method: "query" | "urls";
      keywords?: unknown;
      locations?: unknown;
      urls?: unknown;
    };

    const { id, user_id, method } = scrapping;

    if (!id || !user_id || !method) {
      return NextResponse.json(
        { error: "Invalid scrapping payload" },
        { status: 400 }
      );
    }

    let resolvedUrls: string[] = [];

    /* ----------------------------------
       URL MODE
    ----------------------------------- */
    if (method === "urls") {
      const safeUrls: string[] = Array.isArray(scrapping.urls)
        ? scrapping.urls.filter(
            (u): u is string => typeof u === "string"
          )
        : [];

      resolvedUrls = Array.from(new Set<string>(safeUrls));
    }

    /* ----------------------------------
       QUERY MODE (OSM)
    ----------------------------------- */
    if (method === "query") {
      const safeKeywords: string[] = Array.isArray(scrapping.keywords)
        ? scrapping.keywords.filter(
            (k): k is string => typeof k === "string"
          )
        : [""];

      const safeLocations: string[] = Array.isArray(scrapping.locations)
        ? scrapping.locations.filter(
            (l): l is string => typeof l === "string"
          )
        : [];

      for (const keyword of safeKeywords) {
        for (const location of safeLocations) {
          const results = await getBusinessWebsitesFromOSM(
            keyword,
            location
          );
          resolvedUrls.push(...results);
        }
      }

      resolvedUrls = Array.from(new Set<string>(resolvedUrls));
    }

    console.log(resolvedUrls)
    return;
    /* ----------------------------------
       Save + Trigger scraping
    ----------------------------------- */
    await supabase
      .from("scrappings")
      .update({
        urls: resolvedUrls,
        resolved_at: new Date().toISOString(),
        status: "processing",
      })
      .eq("id", id);

    const handle = await tasks.trigger<typeof scrapeEmailsTask>(
      "scrape-emails-task",
      {
        scrappingId: id,
        userId: user_id,
        urls: resolvedUrls,
      }
    );

    return NextResponse.json({
      success: true,
      totalUrls: resolvedUrls.length,
      runId: handle.id,
    });
  } catch (err: any) {
    console.error("query-search error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
