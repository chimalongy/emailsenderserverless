import { Firecrawl } from '@mendable/firecrawl-js';
import { createClient } from '@supabase/supabase-js';

/* ------------------------------------------------------------------
   Supabase admin client (service role — safe for server/trigger use)
------------------------------------------------------------------ */
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/* ------------------------------------------------------------------
   Fetch all active Firecrawl API keys from the DB
------------------------------------------------------------------ */
async function getActiveApiKeys() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('fire_crawl_apis')
    .select('id, account, api_key')
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to fetch Firecrawl API keys: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('No active Firecrawl API keys found in fire_crawl_apis table');
  }

  return data; // [{ id, account, api_key }]
}

/* ------------------------------------------------------------------
   Core extraction logic for a single API key
------------------------------------------------------------------ */
async function extractWithKey(apiKey, websiteUrl) {
  const firecrawl = new Firecrawl({ apiKey });

  const result = await firecrawl.agent({
    urls: [websiteUrl],
    prompt: `
      Find the following from this website:
      1. All business or contact email addresses of the CEO or Owner.
      2. The owner or CEO name if available.
      Check the home page, /contact, /about, and /team pages.
    `,
    schema: {
      type: 'object',
      properties: {
        business_emails: {
          type: 'array',
          items: { type: 'string' },
          description: 'All business or contact email addresses found',
        },
        owner_name: { type: 'string' },
      },
    },
  });

  return result.data;
}

/* ------------------------------------------------------------------
   Public export — tries each active API key in sequence.
   Returns on first success; throws only if all keys fail.
------------------------------------------------------------------ */
export async function extractBusinessEmail(websiteUrl) {
  const apiKeys = await getActiveApiKeys();

  let lastError = null;

  for (const { id, account, api_key } of apiKeys) {
    try {
      console.log(`[Firecrawl] Trying key for account "${account ?? id}" on: ${websiteUrl}`);
      const data = await extractWithKey(api_key, websiteUrl);
      console.log(`[Firecrawl] ✅ Success with account "${account ?? id}"`);
      return data;
    } catch (err) {
      console.warn(`[Firecrawl] ❌ Key for account "${account ?? id}" failed: ${err.message}`);
      lastError = err;
      // continue to next key
    }
  }

  throw new Error(
    `All ${apiKeys.length} Firecrawl API key(s) exhausted. Last error: ${lastError?.message}`
  );
}