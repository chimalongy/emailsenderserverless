import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';
import { configure, tasks } from '@trigger.dev/sdk';

configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);



async function runGoogleMapsScraper(client, input) {
  const run = await client.actor("spb9TAc2fwKXeBog2").call(input);
  // Fetch and print Actor results from the run's dataset (if any)
  console.log('Results from dataset');
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return items

}






async function fetchAllPages(keyword, locations, apiKeys) {
  let lastError = null;

  for (const apiKey of apiKeys) {
    try {
      console.log(`🔑 Trying Apify API key: ${apiKey.substring(0, 15)}...`);
      const client = new ApifyClient({
        token: apiKey,
      });

      const input = {
        "search_term": [
          keyword
        ],
        "location": locations,
        "predefined_location": "None",
        "number_of_target_records": 200,
        "enhanced_search": false,
        "enrich_records_with_reviews": false,
        "reviews_per_record": 10,
        "reviews_sort_type": "Newest"
      };

      const result = await runGoogleMapsScraper(client, input);
      console.log(`✅ Apify API key succeeded: ${apiKey.substring(0, 15)}...`);
      return result;

    } catch (err) {
      console.error(`❌ Apify API key failed: ${apiKey.substring(0, 15)}... Error:`, err.message || err);
      lastError = err;
    }
  }

  throw new Error(`All Apify API keys exhausted and failed. Last error: ${lastError?.message || lastError}`);
}




export async function POST(req) {
  try {
    const body = await req.json();
    // console.log('🚀 Received scraping request payload:', JSON.stringify(body, null, 2));

    const { scrapping } = body;
    const { id, user_id, method, keywords, locations, urls, name } = scrapping || {};

    console.log('🚀 Scraping request received:');
    console.log(' - Scrapping ID:', id);
    console.log(' - User ID:', user_id);
    console.log(' - Method:', method);
    console.log(' - Keywords:', keywords);
    console.log(' - Locations:', locations);
    console.log(' - URLs:', urls);
    console.log(' - Name:', name);

    if (method === 'google_maps' || method === 'query') {
      if (!Array.isArray(keywords) || keywords.length === 0) {
        return NextResponse.json({ error: 'keywords must be a non-empty array' }, { status: 400 });
      }
      if (!Array.isArray(locations) || locations.length === 0) {
        return NextResponse.json({ error: 'locations must be a non-empty array' }, { status: 400 });
      }

      if (!user_id) {
        return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
      }

      // Fetch all active Apify API keys for this user
      const { data: keysData, error: keysError } = await supabase
        .from('apify_apis')
        .select('api_key')
        .eq('user_id', user_id)
        .eq('staus', 'active')
        .order('created_at', { ascending: false });

      if (keysError) {
        console.error('💥 Database query for Apify keys failed:', keysError);
        return NextResponse.json({ error: `Failed to retrieve Apify keys: ${keysError.message}` }, { status: 500 });
      }

      if (!keysData || keysData.length === 0) {
        return NextResponse.json({ error: 'No active Apify API keys found. Please add one in settings.' }, { status: 400 });
      }

      const activeKeys = keysData.map(k => k.api_key).filter(Boolean);
      const allResults = [];

      for (const keyword of keywords) {
        const places = await fetchAllPages(keyword, locations, activeKeys);
        console.log(`   Found ${places.length} places`);

        if (places.length > 0) {
          for (const place of places) {
            let scrape_item = {
              title: place.title || null,
              website: place.website || null,
              type: place.type || null,
              phone_number: place.phoneNumber || null,
              thumbnail_url: place.thumbnailUrl || null,
            };

            allResults.push(scrape_item);
          }
        }
      }

      console.log(`✅ Total unique results: ${allResults.length}`);

      // Construct the query texts (combination of keywords and locations)
      const queriesList = [];
      for (const keyword of keywords) {
        for (const location of locations) {
          queriesList.push(`${keyword} in ${location}`);
        }
      }

      // Extract website URLs from all results
      const placeUrls = allResults
        .map(item => item.website)
        .filter(url => {
          if (!url) return false;
          try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
          } catch {
            return false;
          }
        });

      // Deduplicate website URLs
      const uniquePlaceUrls = Array.from(new Set(placeUrls));

      // Save to database
      const { error: dbError } = await supabase
        .from('scrappings')
        .update({
          queries: queriesList,
          urls: uniquePlaceUrls,
          bussiness_data: allResults.map(item => JSON.stringify(item)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (dbError) {
        console.error('💥 Database update error:', dbError);
        return NextResponse.json({ error: `Failed to update database: ${dbError.message}` }, { status: 500 });
      }

      // Trigger the background email scraping task
      let triggerRunId = null;
      if (uniquePlaceUrls.length > 0) {
        const payload = {
          scrappingId: id,
          userId: user_id,
          urls: uniquePlaceUrls,
        };
        const handle = await tasks.trigger("scrape-emails-task", payload);
        triggerRunId = handle.id;
      } else {
        // If there are no website URLs to scrape, complete the scraping job immediately
        const { error: completeError } = await supabase
          .from('scrappings')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (completeError) {
          console.error('💥 Database complete error:', completeError);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Found ${allResults.length} unique places. triggered scrapeEmailTask for ${uniquePlaceUrls.length} urls.`,
        receivedData: { id, user_id, method, keywords, locations, name },
        results: allResults,
        total: allResults.length,
        runId: triggerRunId,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Scraping request parameters received and logged successfully',
      receivedData: { id, user_id, method, keywords, locations, urls, name },
    });

  } catch (error) {
    console.error('💥 Error handling scraping request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}