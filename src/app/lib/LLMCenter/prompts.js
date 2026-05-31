
/**
 * Builds the prompts used to analyse a geo domain name and extract
 * service keywords and locations from it.
 *
 * @param {{ domain: string }} params
 * @returns {{ systemPrompt: string, userPrompt: string }}
 *   The LLM will respond with: { service_keywords: string[], locations: string[] }
 */
export function buildGetDomainQueriesPrompt({ domain }) {
    const systemPrompt = `
You are an expert domain name assistant.

Given a geo domain name like austin plumber, determine the service keywords, and the locations  

Always respond with valid JSON in exactly this shape — no markdown, no extra text:
{
    "service_keywords": ["service1", "service2"],
    "locations": ["location1", "location2"]
}
`.trim();

    const userPrompt = `Analyse the following domain and return the JSON described above:\n\nDomain: ${domain}`;

    return { systemPrompt, userPrompt };
}
