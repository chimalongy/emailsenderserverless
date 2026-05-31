import OpenAI from "openai";
import {

    buildGetDomainQueriesPrompt,
} from "./prompts.js";
import { getLLMAPIs } from "./getllmapis.js";

// ─────────────────────────────────────────────────────────────────────────────
// LLM-central.js
//
// THE single source of truth for all LLM API calls in this project.
// Every trigger task that needs an LLM response must import a function from
// here. No other file should instantiate an OpenAI client or call
// client.chat.completions.create directly.
//
// Prompts live in: src/lib/apis/prompts.js
// Model:           deepseek-ai/DeepSeek-V3.1  via Base Ten (OpenAI-compatible)
// ─────────────────────────────────────────────────────────────────────────────

//const DEFAULT_MODEL = "deepseek-ai/DeepSeek-V3.1";
const DEFAULT_MODEL = "moonshotai/Kimi-K2.6";





/**
 * Creates a fresh OpenAI client pointed at the Base Ten endpoint.
 * Called internally — env vars are resolved at invocation time.
 */
function createClient() {
    return new OpenAI({
        baseURL: process.env.BASE_TEN_BASE_URL,
        apiKey: process.env.BASE_TEN_API_KEY,
    });
}



async function callLLM(systemPrompt, userPrompt) {
    const llm_apis = await getLLMAPIs();


    let lastError = null;

    for (const api of llm_apis) {
        try {
            console.log(`Trying provider: ${api.llm_provider} (id: ${api.id})`);

            if (api.llm_provider === 'baseten') {
                const result = await callBaseten(api, systemPrompt, userPrompt);
                return result;
            } else if (api.llm_provider === 'cloudfare') {
                const result = await callCloudflare(api, systemPrompt, userPrompt);
                return result;
            } else {
                console.warn(`Unknown provider "${api.llm_provider}", skipping.`);
                continue;
            }

        } catch (err) {
            console.error(`Provider ${api.llm_provider} (id: ${api.id}) failed: ${err.message}`);
            lastError = err;

        }
    }

    throw new Error(`All LLM APIs failed. Last error: ${lastError?.message}`);
}

async function callBaseten(api, systemPrompt, userPrompt) {
    const { OpenAI } = await import("openai");

    const client = new OpenAI({
        apiKey: api.llm_api,
        baseURL: api.llm_url,
    });

    const response = await client.chat.completions.create({
        model: api.model_name,
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
    });

    let raw = response.choices[0]?.message?.content ?? "";
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(raw);
    } catch {
        throw new Error(`Baseten returned invalid JSON:\n${raw}`);
    }
}

async function callCloudflare(api, systemPrompt, userPrompt) {
    const response = await fetch(api.llm_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    let raw = data.reply ?? "";
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(raw);
    } catch {
        throw new Error(`Cloudflare returned invalid JSON:\n${raw}`);
    }
}













//this is currently not used
async function callLLMMODAL(systemPrompt, userPrompt) {
    const response = await fetch(
        "https://confidence-ogbonna2000--example-vllm-inference-serve.modal.run/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemma-4-26B-A4B-it",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],

                temperature: 0.7,
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json(); // <-- THIS was missing

    let raw = data.choices[0]?.message?.content ?? "";

    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(raw);
    } catch {
        throw new Error(`LLM returned invalid JSON:\n${raw}`);
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// 1. Get Domain Queries
//    Extracts service keywords and locations from a geo domain name.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ domain: string }} params
 * @returns {Promise<{ service_keywords: string[], locations: string[] }>}
 */
export async function llmGetDomainQueries({ domain }) {
    const { systemPrompt, userPrompt } = buildGetDomainQueriesPrompt({ domain });
    let result = await callLLM(systemPrompt, userPrompt);
    console.log("result of Get Domain Queries: ", result);
    return result;
}




