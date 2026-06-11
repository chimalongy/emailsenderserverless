import { Firecrawl } from '@mendable/firecrawl-js';

const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function extractBusinessEmail(websiteUrl) {
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