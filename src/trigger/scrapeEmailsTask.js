import { logger, task, tasks } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

/* ----------------------------------
   Fetch with timeout
----------------------------------- */
async function fetchWithTimeout(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const options = {
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
function isSSLError(err) {
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
function stripWWW(url) {
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
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractEmails(html) {
  return Array.from(new Set(html.match(emailRegex) ?? []));
}

/* ----------------------------------
   Relevant links (contact/about)
----------------------------------- */
function extractRelevantLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const links = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const lower = href.toLowerCase();
    if (lower.includes("contact") || lower.includes("about")) {
      try {
        const absolute = new URL(href, baseUrl).toString();
        if (!links.includes(absolute)) links.push(absolute);
      } catch { }
    }
  });

  return links;
}

/* ----------------------------------
   Puppeteer fallback (SAFE)
----------------------------------- */
async function extractEmailsWithPuppeteer(url, timeoutMs = 25000) {
  let browser;

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
      } catch { }
    }
  }
}

/* ----------------------------------
   Email filtering + normalization
----------------------------------- */
function applyEmailFilters(emails, filterItems, startsWithItems) {
  let processed = [...emails];

  // Remove prefix if startsWithItems is defined
  if (startsWithItems.length) {
    processed = processed.map((email) => {
      for (const prefix of startsWithItems) {
        if (prefix && email.toLowerCase().startsWith(prefix.toLowerCase())) {
          return email.slice(prefix.length);
        }
      }
      return email;
    });
  }

  // Filter out unwanted items
  if (filterItems.length) {
    processed = processed.filter((email) => {
      const lower = email.toLowerCase();
      return !filterItems.some(
        (item) => item && lower.includes(item.toLowerCase())
      );
    });
  }

  // Normalize: trim, lowercase, and deduplicate
  processed = Array.from(
    new Set(processed.map((email) => email.trim().toLowerCase()))
  );

  return processed;
}

/* ----------------------------------
   Payload validator (no zod)
----------------------------------- */
function parsePayload(payload) {
  const { scrappingId, userId, urls } = payload;

  if (
    typeof scrappingId !== "string" ||
    typeof userId !== "string" ||
    !Array.isArray(urls)
  ) {
    throw new Error("Invalid payload: scrappingId, userId must be strings and urls must be an array");
  }

  return { scrappingId, userId, urls };
}

/* ----------------------------------
   Trigger.dev Task
----------------------------------- */
export const scrapeEmailsTask = task({
  id: "scrape-emails-task",

  run: async (payload) => {
    const { scrappingId, urls } = parsePayload(payload);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // get the scrapping name

    const { data: scrapping } = await supabase
      .from("scrappings")
      .select("name")
      .eq("id", scrappingId)
      .single();

      const scrappingName = scrapping?.name;

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

    const results = [];

    for (const originalUrl of urls) {
      const emails = [];
      const addEmail = (email) => {
        if (!emails.includes(email)) emails.push(email);
      };

      try {
        let homeHtml = "";
        let finalUrl = originalUrl;

        try {
          const res = await fetchWithTimeout(originalUrl);
          homeHtml = await res.text();
        } catch (err) {
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
          const pupEmails = await extractEmailsWithPuppeteer(finalUrl);
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
            } catch (err) {
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
              const pupEmails = await extractEmailsWithPuppeteer(link);
              pupEmails.forEach(addEmail);
            }
          } catch {
            continue;
          }
        }

        const filtered = applyEmailFilters(emails, filterItems, startsWithItems);

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
        emails_found: results.reduce((sum, r) => sum + r.emails.length, 0),
        emails: results,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", scrappingId);

      // check if it was and auto - outbound

      if (scrappingName.startsWith("Auto Outbound Scrape")){
          let auto_outbound_name = scrappingName.split(" - ")[1];
          logger.info ("getting auto outbound name: " + auto_outbound_name)

          // get the auto outbound  
          const { data: autoOutbound } = await supabase
            .from("auto_outbounds")
            .select("*")
            .eq("name", auto_outbound_name)
            .single();

           //trigger auto outbound planner here
           if (autoOutbound) {
             await tasks.trigger("auto-outbound-planner", { autoOutbound });
           }


      }



    return { success: true, results };
  },
}); 