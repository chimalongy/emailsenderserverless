import { createClient } from '@supabase/supabase-js';

// Use the service role key so this works in server-side contexts
// (API routes, server components) without a user session.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function getLLMAPIs() {
    const { data, error } = await supabaseAdmin
        .from('llm_apis')
        .select('id, llm_provider, llm_url, llm_api, model_name')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching LLM API keys:', error);
        throw new Error(`Failed to load LLM APIs: ${error.message}`);
    }

    if (!data || data.length === 0) {
        throw new Error('No LLM API configurations found in the database.');
    }

    return data;
}