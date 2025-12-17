import { client } from "./trigger.js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { supabase } from "../../lib/supabase";

function extractEmails(text) {
  const emailRegex =
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return [...new Set(text.match(emailRegex) || [])];
}

async function scrapePage(url) {
  try {
    const res = await fetch(url, { timeout: 15000 });
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);

    return extractEmails($.text());
  } catch {
    return [];
  }
}

async function findExtraPages(homepage) {
  try {
    const res = await fetch(homepage);
    const html = await res.text();
    const $ = cheerio.load(html);

    const links = new Set();

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href")?.toLowerCase();
      if (!href) return;

      if (href.includes("contact") || href.includes("about")) {
        const fullUrl = href.startsWith("http")
          ? href
          : new URL(href, homepage).href;
        links.add(fullUrl);
      }
    });

    return [...links];
  } catch {
    return [];
  }
}

client.defineJob({
  id: "scrapping-job",
  name: "Website Email Scrapping Job",
  version: "1.0.0",
  trigger: client.event("scrapping.job"),

  run: async (payload, io) => {
    const { scrappingId, urls } = payload;

    await io.log("Starting scrapping", { scrappingId });

    let allEmails = new Set();

    for (const site of urls) {
      await io.log("Scraping site", { site });

      // Homepage
      const homeEmails = await scrapePage(site);
      homeEmails.forEach(e => allEmails.add(e));

      // Contact / About pages
      const extraPages = await findExtraPages(site);

      for (const page of extraPages) {
        const pageEmails = await scrapePage(page);
        pageEmails.forEach(e => allEmails.add(e));
      }
    }

    const emailArray = [...allEmails];

    // Save result
    await supabase
      .from("scrapping_results")
      .insert(
        emailArray.map(email => ({
          scrapping_id: scrappingId,
          email,
        }))
      );

    await supabase
      .from("scrappings")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_emails: emailArray.length,
      })
      .eq("id", scrappingId);

    await io.log("Scrapping completed", {
      totalEmails: emailArray.length,
    });

    return {
      success: true,
      totalEmails: emailArray.length,
    };
  },
});
