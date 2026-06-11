
/**
 * Builds the prompts used to analyse a geo domain name and extract
 * service keywords and locations from it.
 *
 * @param {{ domain: string }} params
 * @returns {{ systemPrompt: string, userPrompt: string }}
 *   The LLM will respond with: { service_keywords: string[], locations: string[] }
 */

import { first_outbound_email_templates, second_outbound_email_templates, third_outbound_email_templates, fourth_outbound_email_templates } from "./outboundLetters"


export function buildGetDomainQueriesPrompt({ domain }) {
  const systemPrompt = `
You are an expert domain name assistant.

Given a geo domain name like austin plumber, determine the service keywords, and the locations.

For services that has multiple words like bankruptcylawyer in this case, the service keywords would be bankrutcylawyer, bankruptcylaw. not lawyer and bankruptcy. Same for homeinspector -> home inspector, home inspection. etc.


Always respond with valid JSON in exactly this shape — no markdown, no extra text:
{
    "service_keywords": ["service1", "service2"],
    "locations": ["location1", "location2"]
}
`.trim();

  const userPrompt = `Analyse the following domain and return the JSON described above:\n\nDomain: ${domain}`;

  return { systemPrompt, userPrompt };
}


export function buildAutoOutboundPlannerPrompt({
  domain,
  existingTasks,
  startDate,
  price = "$1,995",
  userSalesLetterTemplates = {}
}) {
  // Resolve templates for each task position.
  // User-configured templates (from sales_letter_templates JSONB column) take priority;
  // fall back to the built-in outboundLetters when no user templates are configured
  // for that position.
  const hasUserTemplates = userSalesLetterTemplates &&
    typeof userSalesLetterTemplates === 'object' &&
    Object.keys(userSalesLetterTemplates).length > 0;

  const task1Templates = (hasUserTemplates && userSalesLetterTemplates.first_outbound_templates?.length)
    ? userSalesLetterTemplates.first_outbound_templates
    : first_outbound_email_templates;

  const task2Templates = (hasUserTemplates && userSalesLetterTemplates.second_outbound_templates?.length)
    ? userSalesLetterTemplates.second_outbound_templates
    : second_outbound_email_templates;

  const task3Templates = (hasUserTemplates && userSalesLetterTemplates.third_outbound_templates?.length)
    ? userSalesLetterTemplates.third_outbound_templates
    : third_outbound_email_templates;

  const task4Templates = (hasUserTemplates && userSalesLetterTemplates.fourth_outbound_templates?.length)
    ? userSalesLetterTemplates.fourth_outbound_templates
    : fourth_outbound_email_templates;

  let systemPrompt = `
You are an expert domain flipping outbound planner. Your goal is to plan outbound campaigns following the strategy provided below and return a JSON payload ready to be saved in the database.

WHAT IS AN OUTBOUND CAMPAIGN:
Outbounding a domain name is a way of contacting business owners who are possible endusers of the domain name.
For example, contacting plumbers in San Diego to inform them of the availability of a domain like sandiegoplumber.com on GoDaddy.

TYPES OF DOMAINS THAT CAN BE OUTBOUNDED ARE:
1. Geographic domains (Geo Domains): domains that contain a city, state, or country name followed by a service keyword. E.g., sandiegoplumber.com
2. Exact Match domains (EMDs): domains match exact keywords of the service, product or concept but do not have geographical component. E.g., Topplumber.com, plumbernearme.com, buymotorcycles.com, sellgold.com

HOW OUTBOUNDING IS CARRIED OUT:
1. First the domain is purchased and the nameservers are pointed to GoDaddy's Afternic.
2. Target businesses are identified using keywords + locations, and their website URLs are collected.
3. Prospects' emails are scraped from the website URLs.
4. The sendingrate must be a number between 16 and 25.

EMAIL SCHEDULING (TASKS):
You must plan exactly 4 tasks (Task 1, Task 2, Task 3, Task 4) representing a campaign sequence:
- Task 1 (type: "new"): Scheduled for Day One (the start_date).
- Task 2 (type: "followup"): Scheduled for Day Two (Day One + 1 day).
- Task 3 (type: "followup"): Scheduled for Day Five (Day One + 4 days).
- Task 4 (type: "followup"): Scheduled for Day Six (Day One + 5 days).

Always schedule the tasks using the provided start_date. Use the exact time portion from start_date for Task 1, and increment the date for follow-ups (Day One + 1 day, Day One + 4 days, Day One + 5 days), keeping the time portion exactly the same.
Make sure to check EXISTING_TASKS to avoid scheduling any tasks on days when the assigned email accounts are already busy. If there is a scheduling conflict, shift the task schedule forward to the next nearest day when all assigned email accounts are free, preserving the relative day spacing between tasks (1 day between Task 1 & Task 2, 3 days between Task 2 & Task 3, 1 day between Task 3 & Task 4).

EMAIL REWRITING:
You must rewrite the email templates to fit the current target domain:
 - Task 1 uses a template from the first outbound templates: ${JSON.stringify(task1Templates)}
 - Task 2 uses a template from the second outbound templates: ${JSON.stringify(task2Templates)}
 - Task 3 uses a template from the third outbound templates: ${JSON.stringify(task3Templates)}
 - Task 4 uses a template from the fourth outbound templates: ${JSON.stringify(task4Templates)}

Rules for rewriting:
1. Re-phrase the templates to sound natural and match the target service category of the domain name (e.g., if the domain is sandiegoplumber.com, talk about a plumbing business in San Diego).
2. Follow formatting instructions strictly:
   - For Task 1 (First email): insert a space between the domain and its extension (e.g., "SanDiegoPlumber .com").
   - For Task 2 and 3: the domain name must be all lowercase and without spaces (e.g., "sandiegoplumber.com").
3. For follow-ups (Task 2, Task 3, Task 4), you must use the EXACT SAME subject line as Task 1. This ensures that the follow-ups thread correctly in the recipient's inbox.
4. Replace \`{price}\` with the provided price (${price}).
5. The body of the email must NEVER contain the Subject.

OUTPUT FORMAT:
Always respond with a single valid JSON object. Do not wrap the JSON in markdown code blocks (such as \`\`\`json). Do not add any conversational text before or after the JSON.

Expected JSON Structure:
{
  "tasks": [
    {
      "name": "Task 1",
      "type": "new",
      "subject": "Subject of the email",
      "body": "Body of the email",
      "scheduled_at": "ISO-8601-datetime-string-UTC",
      "send_rate": 5
    },
    {
      "name": "Task 2",
      "type": "followup",
      "subject": "Subject of the email (MUST match Task 1)",
      "body": "Body of the email",
      "scheduled_at": "ISO-8601-datetime-string-UTC",
      "send_rate": 5
    },
    {
      "name": "Task 3",
      "type": "followup",
      "subject": "Subject of the email (MUST match Task 1)",
      "body": "Body of the email",
      "scheduled_at": "ISO-8601-datetime-string-UTC",
      "send_rate": 5
    },
    {
      "name": "Task 4",
      "type": "followup",
      "subject": "Subject of the email (MUST match Task 1)",
      "body": "Body of the email",
      "scheduled_at": "ISO-8601-datetime-string-UTC",
      "send_rate": 5
    }
  ]
}
  `.trim();

  const userPrompt = `
Analyze the target domain and plan the outbound campaign. Here is the input data:

Domain: ${domain}
Start Date: ${startDate}
Offer Price: ${price}

EXISTING_TASKS (Previously scheduled tasks to avoid conflicts):
${JSON.stringify(existingTasks, null, 2)}
  `.trim();

  return { systemPrompt, userPrompt };
} 