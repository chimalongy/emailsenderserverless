import { task } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import fetch, { RequestInit, Response } from "node-fetch";
import * as cheerio from "cheerio";

/* ----------------------------------
   Fetch with timeout
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
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
    };

    return await fetch(url, options);
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ----------------------------------
   URL helpers
----------------------------------- */
function stripWWW(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.startsWith("www.")) {
      u.hostname = u.hostname.replace(/^www\./, "");
    }
    return u.toString();
  } catch {
    return url;
  }
}

/* ----------------------------------
   Helpers
----------------------------------- */
const emailRegex =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractEmails(html: string): string[] {
  return Array.from(new Set(html.match(emailRegex) ?? []));
}

function extractRelevantLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const lower = href.toLowerCase();
    if (lower.includes("contact") || lower.includes("about")) {
      try {
        const absolute = new URL(href, baseUrl).toString();
        if (!links.includes(absolute)) links.push(absolute);
      } catch {}
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

type ScrapeResult = {
  link_scraped: string;
  emails: string[];
};

/* ----------------------------------
   Trigger.dev Task
----------------------------------- */
export const scrapeEmailsTask = task({
  id: "scrape-emails-task",

  run: async (payload: ScrapePayload) => {
    const { scrappingId, urls } = payloadSchema.parse(payload);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
      .from("scrappings")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", scrappingId);

    const results: ScrapeResult[] = [];

    try {
      for (const originalUrl of urls) {
        const emails: string[] = [];
        const addEmail = (email: string) => {
          if (!emails.includes(email)) emails.push(email);
        };

        let homeHtml = "";
        let finalUrl = originalUrl;

        /* ---------- Homepage fetch ---------- */
        try {
          try {
            const res = await fetchWithTimeout(originalUrl);
            homeHtml = await res.text();
          } catch (err: any) {
            // Retry without www for SSL or DNS issues
            if (
              originalUrl.includes("www.") &&
              (err.message?.includes("certificate") ||
                err.code === "ENOTFOUND")
            ) {
              finalUrl = stripWWW(originalUrl);
              const res = await fetchWithTimeout(finalUrl);
              homeHtml = await res.text();
            } else {
              throw err;
            }
          }
        } catch (err: any) {
          // ❗ NON-FATAL ERRORS → SKIP
          if (
            err.name === "AbortError" ||
            err.code === "ENOTFOUND" ||
            err.code === "EAI_AGAIN" ||
            err.code === "ECONNREFUSED" ||
            err.code === "ECONNRESET"
          ) {
            results.push({ link_scraped: originalUrl, emails: [] });
            continue;
          }

          throw err;
        }

        extractEmails(homeHtml).forEach(addEmail);

        /* ---------- Contact/About pages ---------- */
        const subLinks = extractRelevantLinks(homeHtml, finalUrl);

        for (const link of subLinks) {
          try {
            let html = "";

            try {
              const res = await fetchWithTimeout(link);
              html = await res.text();
            } catch (err: any) {
              if (
                link.includes("www.") &&
                (err.message?.includes("certificate") ||
                  err.code === "ENOTFOUND")
              ) {
                const fallback = stripWWW(link);
                const res = await fetchWithTimeout(fallback);
                html = await res.text();
              } else {
                throw err;
              }
            }

            extractEmails(html).forEach(addEmail);
          } catch (err: any) {
            // Ignore subpage failures
            if (
              err.name === "AbortError" ||
              err.code === "ENOTFOUND" ||
              err.code === "EAI_AGAIN"
            ) {
              continue;
            }
          }
        }

        results.push({
          link_scraped: originalUrl,
          emails,
        });
      }

      await supabase
        .from("scrappings")
        .update({
          status: "completed",
          emails_found: results.reduce(
            (sum, r) => sum + r.emails.length,
            0
          ),
          emails: results,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", scrappingId);

      return { success: true, results };
    } catch (error) {
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
 