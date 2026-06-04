
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


export function buildAutoOutboundPlannerPrompt({
  domain,
  endUsersList,
  sendingGmailAccounts,
  existingTasks,
  lastAllocatedEmail,
  lastAllocatedEmailRemainder = 0,
  startDate,
  price = "$1,995"
}) {
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
3. Prospects' emails are scraped from the website URLs. This list of prospective buyers is provided to you as END_USERS_LIST.
4. You are provided with multiple Gmail sending accounts as SENDING_GMAIL_ACCOUNTS. Each has a daily limit, daily sent count today, and app password.
5. You are to allocate prospects from END_USERS_LIST to SENDING_GMAIL_ACCOUNTS sequentially.
   - If a previous run left a remainder (LAST_ALLOCATED_EMAIL_REMAINDER > 0) on the last used sending account (LAST_ALLOCATED_EMAIL), you should first allocate prospects to that account up to its remaining capacity.
   - Otherwise, or once that remainder is satisfied, proceed to allocate prospects to the next active SENDING_GMAIL_ACCOUNTS sequentially.
   - Daily Capacity per account = daily_limit - sent_today. Never exceed the capacity of any account.
6. The database stores the last used sending account email in public.users.last_allocated_email, and its remaining capacity (daily capacity minus allocated count in this run) in public.users.last_allocated_email_remainder.
7. The sendingrate must be a number between 16 and 25.

EMAIL SCHEDULING (TASKS):
You must plan exactly 4 tasks (Task 1, Task 2, Task 3, Task 4) representing a campaign sequence:
- Task 1 (type: "new"): Scheduled for Day One (the start_date).
- Task 2 (type: "followup"): Scheduled for Day Two (Day One + 1 day).
- Task 3 (type: "followup"): Scheduled for Day Five (Day One + 4 days).
- Task 4 (type: "followup"): Scheduled for Day Six (Day One + 5 days).

Always schedule the tasks for 09:00:00 UTC/Z (e.g. 2026-06-04T09:00:00.000Z).
Make sure to check EXISTING_TASKS to avoid scheduling any tasks on days when the assigned email accounts are already busy. If there is a scheduling conflict, shift the task schedule forward to the next nearest day when all assigned email accounts are free, preserving the relative day spacing between tasks (1 day between Task 1 & Task 2, 3 days between Task 2 & Task 3, 1 day between Task 3 & Task 4).

EMAIL REWRITING:
You must rewrite the email templates to fit the current target domain:
- Task 1 uses a template from the first outbound templates: ${JSON.stringify(first_outbound_email_templates)}
- Task 2 uses a template from the second outbound templates: ${JSON.stringify(second_outbound_email_templates)}
- Task 3 uses a template from the third outbound templates: ${JSON.stringify(third_outbound_email_templates)}
- Task 4 uses a template from the fourth outbound templates: ${JSON.stringify(fourth_outbound_email_templates)}

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
  "allocations": [
    {
      "account_id": "account-uuid",
      "allocated_emails": 15
    }
  ],
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
  ],
  "last_allocated_email": "last_sender_email@gmail.com",
  "last_allocated_email_remainder": 25
}
  `.trim();

  const userPrompt = `
Analyze the target domain and plan the outbound campaign. Here is the input data:

Domain: ${domain}
Start Date: ${startDate}
Offer Price: ${price}
Last Used Sending Email (Previous): ${lastAllocatedEmail}
Remaining Capacity of Last Used Sender: ${lastAllocatedEmailRemainder}

END_USERS_LIST (Scraped prospective buyer emails):
${JSON.stringify(endUsersList, null, 2)}

SENDING_GMAIL_ACCOUNTS:
${JSON.stringify(sendingGmailAccounts, null, 2)}

EXISTING_TASKS (Previously scheduled tasks to avoid conflicts):
${JSON.stringify(existingTasks, null, 2)}
  `.trim();

  return { systemPrompt, userPrompt };
} 