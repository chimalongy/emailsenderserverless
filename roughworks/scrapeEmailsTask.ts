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
   SSL / Network error detector
----------------------------------- */
function isSSLError(err: any): boolean {
  const msg = err?.message?.toLowerCase() ?? "";

  return (
    err?.code === "EPROTO" ||
    err?.code === "ERR_TLS_CERT_ALTNAME_INVALID" ||
    msg.includes("ssl") ||
    msg.includes("handshake") ||
    msg.includes("openssl") ||
    msg.includes("certificate") ||
    msg.includes("altname") ||
    msg.includes("hostname/ip does not match")
  );
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
   Email helpers
----------------------------------- */
const emailRegex =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractEmails(html: string): string[] {
  return Array.from(new Set(html.match(emailRegex) ?? []));
}

/* ----------------------------------
   Relevant links (contact/about)
----------------------------------- */
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
   Puppeteer fallback (SAFE)
----------------------------------- */
async function extractEmailsWithPuppeteer(
  url: string,
  timeoutMs = 25000
): Promise<string[]> {
  let browser: any;

  try {
    const puppeteer = await import("puppeteer");

  browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});


    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: timeoutMs,
    });

    const html = await page.content();
    return extractEmails(html);
  } catch {
    return [];
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}

/* ----------------------------------
   Email filtering
----------------------------------- */
function applyEmailFilters(
  emails: string[],
  filterItems: string[],
  startsWithItems: string[]
): string[] {
  let processed = [...emails];

  if (startsWithItems.length) {
    processed = processed.map((email) => {
      for (const prefix of startsWithItems) {
        if (
          prefix &&
          email.toLowerCase().startsWith(prefix.toLowerCase())
        ) {
          return email.slice(prefix.length);
        }
      }
      return email;
    });
  }

  if (filterItems.length) {
    processed = processed.filter((email) => {
      const lower = email.toLowerCase();
      return !filterItems.some(
        (item) => item && lower.includes(item.toLowerCase())
      );
    });
  }

  return Array.from(new Set(processed));
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

    const { data: filters } = await supabase
      .from("scrape_email_filters")
      .select("filter_item, starts_with");

    const filterItems =
      filters?.map((f) => f.filter_item).filter(Boolean) ?? [];
    const startsWithItems =
      filters?.map((f) => f.starts_with).filter(Boolean) ?? [];

    await supabase
      .from("scrappings")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", scrappingId);

    const results: ScrapeResult[] = [];

    for (const originalUrl of urls) {
      const emails: string[] = [];
      const addEmail = (email: string) => {
        if (!emails.includes(email)) emails.push(email);
      };

      try {
        let homeHtml = "";
        let finalUrl = originalUrl;

        try {
          const res = await fetchWithTimeout(originalUrl);
          homeHtml = await res.text();
        } catch (err: any) {
          if (
            originalUrl.includes("www.") &&
            (isSSLError(err) || err.code === "ENOTFOUND")
          ) {
            finalUrl = stripWWW(originalUrl);
            const res = await fetchWithTimeout(finalUrl);
            homeHtml = await res.text();
          } else {
            throw err;
          }
        }

        /* ---------- CHEERIO FIRST ---------- */
        const homeEmails = extractEmails(homeHtml);
        homeEmails.forEach(addEmail);

        /* ---------- PUPPETEER FALLBACK ---------- */
        if (emails.length === 0) {
          const pupEmails =
            await extractEmailsWithPuppeteer(finalUrl);
          pupEmails.forEach(addEmail);
        }

        /* ---------- CONTACT / ABOUT ---------- */
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
                (isSSLError(err) || err.code === "ENOTFOUND")
              ) {
                const fallback = stripWWW(link);
                const res = await fetchWithTimeout(fallback);
                html = await res.text();
              } else {
                throw err;
              }
            }

            const cheerioEmails = extractEmails(html);
            cheerioEmails.forEach(addEmail);

            if (cheerioEmails.length === 0) {
              const pupEmails =
                await extractEmailsWithPuppeteer(link);
              pupEmails.forEach(addEmail);
            }
          } catch {
            continue;
          }
        }

        const filtered = applyEmailFilters(
          emails,
          filterItems,
          startsWithItems
        );

        results.push({
          link_scraped: originalUrl,
          emails: filtered,
        });
      } catch {
        results.push({ link_scraped: originalUrl, emails: [] });
      }
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
  },
});
