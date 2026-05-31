import { task, logger, tasks } from "@trigger.dev/sdk/v3";
import { llmGetDomainQueries } from "../app/lib/LLMCenter/LLM-central.js";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runApifyActor(apiKey, input) {
  // 1. Start the actor run
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/spb9TAc2fwKXeBog2/runs?token=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!runRes.ok) {
    const errText = await runRes.text();
    throw new Error(`Apify run start failed: ${runRes.status} — ${errText}`);
  }

  const { data: runData } = await runRes.json();
  const runId = runData.id;
  const datasetId = runData.defaultDatasetId;

  console.log(`▶️  Actor run started | runId=${runId} | datasetId=${datasetId}`);

  // 2. Poll until the run reaches a terminal state
  const POLL_INTERVAL_MS = 6000;
  const MAX_WAIT_MS = 8 * 60 * 1000; // 8 minutes hard cap
  const startedAt = Date.now();

  while (true) {
    if (Date.now() - startedAt > MAX_WAIT_MS) {
      throw new Error(`Apify run timed out after 8 minutes | runId=${runId}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
    );

    if (!statusRes.ok) {
      console.warn(`⚠️  Status check failed (${statusRes.status}), retrying...`);
      continue;
    }

    const { data: statusData } = await statusRes.json();
    const status = statusData.status;
    console.log(`⏳ Run status: ${status}`);

    if (status === "SUCCEEDED") break;

    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
      throw new Error(`Apify run ended with status ${status} | runId=${runId}`);
    }
  }

  // 3. Fetch dataset items
  const dataRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&format=json`
  );

  if (!dataRes.ok) {
    throw new Error(`Failed to fetch dataset items: ${dataRes.status} | datasetId=${datasetId}`);
  }

  const items = await dataRes.json();
  console.log(`✅ Dataset returned ${items.length} items`);
  return items;
}

async function fetchAllPages(keyword, locations, apiKeys) {
  let lastError = null;

  const input = {
    "search_term": [keyword],
    "location": locations,
    "predefined_location": "None",
    "number_of_target_records": 200,
    "enhanced_search": false,
    "enrich_records_with_reviews": false,
    "reviews_per_record": 10,
    "reviews_sort_type": "Newest"
  };

  for (const apiKey of apiKeys) {
    try {
      console.log(`🔑 Trying Apify API key: ${apiKey.substring(0, 15)}...`);
      const result = await runApifyActor(apiKey, input);
      console.log(`✅ Apify API key succeeded: ${apiKey.substring(0, 15)}...`);
      return result;
    } catch (err) {
      console.error(`❌ Apify API key failed: ${apiKey.substring(0, 15)}... Error:`, err.message || err);
      lastError = err;
    }
  }

  throw new Error(`All Apify API keys exhausted and failed. Last error: ${lastError?.message || lastError}`);
}

export const autoOutboundSetupTask = task({
  id: "auto-outbound-setup",
  retry: {
    maxAttempts: 1,
  },
  run: async (payload) => {
    const { autoOutboundId, userId, domain, name, startDate } = payload;

    console.log(
      `[auto-outbound-setup] Task triggered for outbound "${name}" (id: ${autoOutboundId})`
    );
    console.log(`  user_id   : ${userId}`);
    console.log(`  domain    : ${domain}`);
    console.log(`  startDate : ${startDate}`);

    logger.info("Step 1 — Get domain queries (keywords + locations) via LLM")
    const { service_keywords, locations } = await llmGetDomainQueries({ domain });
    logger.info(`service_keywords` + JSON.stringify(service_keywords))
    logger.info(`locations` + JSON.stringify(locations));

    logger.info("Step 2 — Find prospect emails matching those keywords + locations")
    const keywords = service_keywords;

    // Fetch all active Apify API keys for this user
    const { data: keysData, error: keysError } = await supabase
      .from('apify_apis')
      .select('api_key')
      .eq('user_id', userId)
      .eq('staus', 'active')
      .order('created_at', { ascending: false });

    if (keysError) {
      logger.error('💥 Database query for Apify keys failed:', keysError);
      throw new Error(`Failed to retrieve Apify keys: ${keysError.message}`);
    }

    if (!keysData || keysData.length === 0) {
      throw new Error('No active Apify API keys found. Please add one in settings.');
    }

    const activeKeys = keysData.map(k => k.api_key).filter(Boolean);
    const allResults = [];

    for (const keyword of keywords) {
      const places = await fetchAllPages(keyword, locations, activeKeys);
      logger.info(`   Found ${places.length} places for keyword: ${keyword}`);

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

    logger.info(`✅ Total unique results: ${allResults.length}`);

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
    logger.info(`"NUMBER OF UNIQUE PLACE URLS "` + JSON.stringify(uniquePlaceUrls.length));

    if (uniquePlaceUrls.length === 0) {
      logger.info(`No URLs to scrape. Scraping job completed immediately.`);
      return {
        success: false,
        autoOutboundId,
        message: "Auto-outbound stopped, no URLs found to scrape.",
      };
    }

    // Save to database
    const { data: scrapeData, error: dbError } = await supabase
      .from('scrappings')
      .insert({
        user_id: userId,
        method: 'query',
        keywords: keywords,
        locations: locations,
        name: `Auto Outbound Scrape - ${name}`,
        status: 'pending',
        queries: queriesList,
        urls: uniquePlaceUrls,
        bussiness_data: allResults.map(item => JSON.stringify(item)),
      })
      .select()
      .single();

    if (dbError) {
      logger.error('💥 Database insert error:', dbError);
      throw new Error(`Failed to create scrape record: ${dbError.message}`);
    }

    // Trigger the background email scraping task
    if (uniquePlaceUrls.length > 0) {
      const scrapePayload = {
        scrappingId: scrapeData.id,
        userId: userId,
        urls: uniquePlaceUrls,
      };
      await tasks.trigger("scrape-emails-task", scrapePayload);
      logger.info(`Triggered scrape-emails-task for ${uniquePlaceUrls.length} urls`);

      // update the scrape id in the auto outbounds table
      const { error: updateError } = await supabase
        .from('auto_outbounds')
        .update({ scrape_id: scrapeData.id })
        .eq('id', autoOutboundId);

      if (updateError) {
        logger.error('💥 Database update error:', updateError);
        throw new Error(`Failed to update scrape id in auto_outbounds table: ${updateError.message}`);
      }

      logger.info(`Updated scrape id in auto_outbounds table`);
    } else {
      logger.info(`No URLs to scrape. Scraping job completed immediately.`);
    }

    // Step 3 — Plan outbound sequences with AI
    logger.info("Step 3 — Plan outbound sequences with AI")
    // TODO: generate personalised email sequences per prospect

    logger.info("Step 4 — Queue outbound emails for sending")
    // TODO: insert into email_queue for the configured domain

    return {
      success: true,
      autoOutboundId,
      message: "Auto-outbound setup task received — and triggered scrape job.",
    };
  },
});