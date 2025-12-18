import { task } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import fetch, { RequestInit, Response } from "node-fetch";
import * as cheerio from "cheerio";

/* ----------------------------------
   Fetch with timeout (ES5 safe)
----------------------------------- */
async function fetchWithTimeout(
  url: string,
  timeoutMs = 20000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const options: RequestInit = {
      signal: controller.signal,
      redirect: "follow",
    };
    return await fetch(url, options);
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ----------------------------------
   Helpers
----------------------------------- */
const emailRegex =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractEmails(html: string): string[] {
  const matches = html.match(emailRegex) ?? [];
  const unique: string[] = [];

  for (let i = 0; i < matches.length; i++) {
    if (!unique.includes(matches[i])) {
      unique.push(matches[i]);
    }
  }

  return unique;
}

function extractRelevantLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const lowerHref = href.toLowerCase();

    if (lowerHref.includes("contact") || lowerHref.includes("about")) {
      try {
        const absoluteUrl = new URL(href, baseUrl).toString();
        if (!links.includes(absoluteUrl)) {
          links.push(absoluteUrl);
        }
      } catch {
        // ignore invalid urls
      }
    }
  });

  return links;
}

/* ----------------------------------
   Payload schema
----------------------------------- */
const payloadSchema = z.object({
  scrappingId: z.string().uuid(),
  userId: z.string().uuid(),
  urls: z.array(z.string().url()),
});

type ScrapePayload = z.infer<typeof payloadSchema>;

/* ----------------------------------
   Trigger.dev Task
----------------------------------- */
export const scrapeEmailsTask = task({
  id: "scrape-emails-task",

  run: async (payload: ScrapePayload) => {
    const { scrappingId, urls } = payloadSchema.parse(payload);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    /* ----------------------------------
       Mark scrapping as started
    ----------------------------------- */
    await supabase
      .from("scrappings")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", scrappingId);

    const allEmails: string[] = [];

    const addEmail = (email: string) => {
      if (!allEmails.includes(email)) {
        allEmails.push(email);
      }
    };

    try {
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];

        // 1️⃣ Fetch homepage
        const homeResponse = await fetchWithTimeout(url);
        const homeHtml = await homeResponse.text();

        const homeEmails = extractEmails(homeHtml);
        for (let e = 0; e < homeEmails.length; e++) {
          addEmail(homeEmails[e]);
        }

        // 2️⃣ Extract contact/about links
        const subLinks = extractRelevantLinks(homeHtml, url);

        // 3️⃣ Visit contact/about pages
        for (let j = 0; j < subLinks.length; j++) {
          try {
            const pageResponse = await fetchWithTimeout(subLinks[j]);
            const pageHtml = await pageResponse.text();

            const pageEmails = extractEmails(pageHtml);
            for (let k = 0; k < pageEmails.length; k++) {
              addEmail(pageEmails[k]);
            }
          } catch {
            // ignore page errors
          }
        }
      }

      /* ----------------------------------
         Mark scrapping as completed
      ----------------------------------- */
      await supabase
        .from("scrappings")
        .update({
          status: "completed",
          emails_found: allEmails.length,
          emails: allEmails, // text[]
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", scrappingId);

      return {
        success: true,
        emailsFound: allEmails.length,
        emails: allEmails,
      };
    } catch (error) {
      /* ----------------------------------
         Mark scrapping as failed
      ----------------------------------- */
      await supabase
        .from("scrappings")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", scrappingId);

      throw error;
    }
  },
});
 