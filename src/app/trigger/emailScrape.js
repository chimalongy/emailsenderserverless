import { task } from "@trigger.dev/sdk";
import fetch from "node-fetch";
import cheerio from "cheerio";

function extractEmails(text) {
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return [...new Set(text.match(regex) || [])];
}

async function scrapePage(url) {
  try {
    const res = await fetch(url, { timeout: 15000 });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    return extractEmails($.text());
  } catch (err) {
    console.error("Error scraping page:", url, err.message);
    return [];
  }
}

export const emailScrape = task({
  id: "email-scrape",
  run: async (payload) => {
    const allEmails = new Set();

    for (const site of payload.urls) {
      // Scrape homepage
      (await scrapePage(site)).forEach((e) => allEmails.add(e));

      // Scan links for "contact" or "about"
      try {
        const res = await fetch(site, { timeout: 15000 });
        const html = await res.text();
        const $ = cheerio.load(html);

        $("a[href]").each(async (_, el) => {
          const href = $(el).attr("href")?.toLowerCase();
          if (!href) return;

          if (href.includes("contact") || href.includes("about")) {
            const fullUrl = href.startsWith("http") ? href : new URL(href, site).href;
            (await scrapePage(fullUrl)).forEach((e) => allEmails.add(e));
          }
        });
      } catch {}
    }

    return {
      scrappingId: payload.scrappingId,
      emails: [...allEmails],
    };
  },
});
