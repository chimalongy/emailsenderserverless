import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { scrapping } = await req.json();
    const { keywords, locations } = scrapping;

    console.log('🚀 Starting Scrape for:', { keywords, locations });
    const allFoundBusinesses = [];

    for (const location of locations) {
      for (const keyword of keywords) {
        try {
          console.log(`🔍 Searching for "${keyword}" in "${location}"...`);

          // This query is more robust:
          // 1. We use a wider 'around' search or a more flexible 'area' search.
          // 2. We search for the keyword in amenity, shop, and craft.
          const overpassQuery = `
            [out:json][timeout:60];
            // Search for the location area first
            {{geocodeArea:${location}}}->.searchArea;
            (
              node["amenity"~"${keyword}", i](area.searchArea);
              way["amenity"~"${keyword}", i](area.searchArea);
              node["shop"~"${keyword}", i](area.searchArea);
              way["shop"~"${keyword}", i](area.searchArea);
              node["craft"~"${keyword}", i](area.searchArea);
              way["craft"~"${keyword}", i](area.searchArea);
              // Also search for the keyword in the name just in case
              node["name"~"${keyword}", i](area.searchArea);
              way["name"~"${keyword}", i](area.searchArea);
            );
            out body;
            >;
            out skel qt;
          `;

          // Note: Overpass Turbo supports {{geocodeArea}}, 
          // but for raw API calls, we must use the Area ID or search by name.
          // Let's use the most reliable RAW API format:
          const rawQuery = `
            [out:json][timeout:60];
            area["name"~"${location}", i]->.searchArea;
            (
              node["amenity"~"${keyword}", i](area.searchArea);
              node["shop"~"${keyword}", i](area.searchArea);
              node["craft"~"${keyword}", i](area.searchArea);
              node["name"~"${keyword}", i](area.searchArea);
            );
            out body;
          `;

          const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: rawQuery,
          });

          const data = await response.json();

          if (!data.elements || data.elements.length === 0) {
            console.log(`⚠️ No results found for "${keyword}" in "${location}".`);
            continue;
          }

          const businesses = data.elements.map(item => ({
            name: item.tags?.name || "Unknown",
            website: item.tags?.website || item.tags?.["contact:website"] || "N/A",
            phone: item.tags?.phone || item.tags?.["contact:phone"] || "N/A",
            city: item.tags?.["addr:city"] || location
          }));

          allFoundBusinesses.push(...businesses);
          console.log(`✅ Success: Found ${businesses.length} items in ${location}`);

        } catch (err) {
          console.error(`💥 Query failed for ${location}:`, err);
        }
      }
    }

    console.table(allFoundBusinesses);
    return NextResponse.json({ success: true, count: allFoundBusinesses.length });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}