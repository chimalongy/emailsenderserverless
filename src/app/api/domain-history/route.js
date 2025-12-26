import axios from "axios";
import dns from "dns/promises";
import { NextResponse } from "next/server";

/* -------------------------
   Utils
------------------------- */
function isValidDomain(domain) {
  return /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(domain);
}

function extractSLD(domain) {
  return domain.split(".")[0];
}

function extractTLD(domain) {
  return domain.split(".").slice(1).join(".");
}

/* -------------------------
   Registrar Extraction (FIX)
------------------------- */
function extractRegistrarName(rdapData) {
  if (!rdapData?.entities) return null;

  const registrarEntity = rdapData.entities.find(e =>
    Array.isArray(e.roles) && e.roles.includes("registrar")
  );

  if (!registrarEntity?.vcardArray) return null;

  const vcard = registrarEntity.vcardArray[1];
  const fn = vcard?.find(item => item[0] === "fn");

  return fn?.[3] || null;
}

/* -------------------------
   DNS Check
------------------------- */
async function dnsCheck(domain) {
  try {
    await dns.resolveAny(domain);
    return true;
  } catch {
    return false;
  }
}

/* -------------------------
   RDAP.org Fallback
------------------------- */
async function rdapOrgCheck(domain) {
  try {
    const res = await axios.get(
      `https://rdap.org/domain/${domain}`,
      { validateStatus: () => true }
    );

    if (res.status === 200) return { registered: true, data: res.data };
    if (res.status === 404) return { registered: false, data: null };

    return { registered: null, data: null };
  } catch {
    return { registered: null, data: null };
  }
}

/* -------------------------
   IANA RDAP Bootstrap
------------------------- */
let rdapBootstrapCache = null;

async function getRdapBaseUrl(tld) {
  if (!rdapBootstrapCache) {
    const res = await axios.get(
      "https://data.iana.org/rdap/dns.json",
      { headers: { "Cache-Control": "no-store" } }
    );
    rdapBootstrapCache = res.data.services;
  }

  for (const service of rdapBootstrapCache) {
    if (service[0].includes(tld)) {
      return service[1][0];
    }
  }
  return null;
}

/* -------------------------
   Registry RDAP
------------------------- */
async function registryRdapCheck(domain) {
  const tld = extractTLD(domain);
  const baseUrl = await getRdapBaseUrl(tld);

  if (!baseUrl) return { registered: null, data: null };

  try {
    const res = await axios.get(
      `${baseUrl}domain/${domain}`,
      { validateStatus: () => true }
    );

    if (res.status === 200) return { registered: true, data: res.data };
    if (res.status === 404) return { registered: false, data: null };

    return { registered: null, data: null };
  } catch {
    return { registered: null, data: null };
  }
}

/* -------------------------
   Availability Decision
------------------------- */
async function checkAvailability(domain) {
  const [dnsRes, rdapOrgRes, registryRes] = await Promise.all([
    dnsCheck(domain),
    rdapOrgCheck(domain),
    registryRdapCheck(domain)
  ]);

  if (
    dnsRes === true ||
    rdapOrgRes.registered === true ||
    registryRes.registered === true
  ) {
    return {
      status: "registered",
      rdapData: registryRes.data || rdapOrgRes.data
    };
  }

  if (
    dnsRes === false &&
    rdapOrgRes.registered === false &&
    registryRes.registered === false
  ) {
    return { status: "available", rdapData: null };
  }

  return {
    status: "unknown",
    rdapData: registryRes.data || rdapOrgRes.data
  };
}

/* -------------------------
   TLD Availability
------------------------- */
async function checkTLDAvailability(domain) {
  const sld = extractSLD(domain);
  const tlds = ["com","net","org","io","co","dev","app","ai","xyz"];

  return Promise.all(
    tlds.map(async tld => {
      const full = `${sld}.${tld}`;
      const res = await checkAvailability(full);
      return { domain: full, status: res.status };
    })
  );
}

/* -------------------------
   Domain Metrics
------------------------- */
async function getDomainMetrics(domain) {
  const length = domain.length;
  const hasHyphen = domain.includes("-");
  const hasNumber = /\d/.test(domain);
  const words = domain.split(/[-.]/).filter(Boolean);
  const wordCount = words.length;

  function readabilityScore(domain) {
    const vowels = domain.match(/[aeiou]/gi)?.length || 0;
    const consonants = domain.match(/[bcdfghjklmnpqrstvwxyz]/gi)?.length || 0;
    const ratio = vowels / (consonants || 1);
    const syllables = words.reduce((acc, w) => acc + Math.ceil(w.length / 3), 0);
    return Math.floor((ratio * 50) + (syllables * 10));
  }
  const pronounceabilityScore = readabilityScore(domain);

  let mxRecords = [];
  let aRecords = [];
  let aaaaRecords = [];

  try { mxRecords = (await dns.resolveMx(domain)).map(r => r.exchange.toLowerCase()); } catch {}
  try { aRecords = await dns.resolve4(domain); } catch {}
  try { aaaaRecords = await dns.resolve6(domain); } catch {}

  return { length, wordCount, hasHyphen, hasNumber, pronounceabilityScore, mxRecords, aRecords, aaaaRecords };
}

/* -------------------------
   Google Safe Browsing Blacklist Check
------------------------- */
async function checkBlacklist(domain) {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY 
  console.log(apiKey)
  
  if (!apiKey) {
    console.warn("Google Safe Browsing API key not set");
    return { 
      blacklisted: false, 
      detail: "API key not configured",
      provider: "Google Safe Browsing"
    };
  }

  const url = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
  const payload = {
    client: { 
      clientId: "domain-checker", 
      clientVersion: "1.0" 
    },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url: `http://${domain}` }, { url: `https://${domain}` }]
    }
  };

  try {
    const res = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 5000
    });
    
    if (res.data && res.data.matches && res.data.matches.length > 0) {
      return { 
        blacklisted: true, 
        detail: res.data.matches,
        provider: "Google Safe Browsing"
      };
    } else {
      return { 
        blacklisted: false, 
        detail: null,
        provider: "Google Safe Browsing"
      };
    }
  } catch (err) {
    console.error("Safe Browsing API error:", err.message);
    return { 
      blacklisted: false, 
      detail: `API error: ${err.message}`,
      provider: "Google Safe Browsing"
    };
  }
}

/* -------------------------
   Additional Blacklist Checks (Optional)
------------------------- */
async function checkAdditionalBlacklists(domain) {
  const blacklists = [
    {
      name: "PhishTank",
      url: `https://checkphish.ai/api/neo/check?url=${encodeURIComponent(domain)}`,
      enabled: false // Requires API key
    },
    {
      name: "URLhaus",
      url: `https://urlhaus-api.abuse.ch/v1/host/${domain}/`,
      parse: (data) => data.query_status === "ok" && data.threat === "malware_download"
    },
    {
      name: "Spamhaus DBL",
      check: async () => {
        try {
          await dns.resolveTxt(`${domain}.dbl.spamhaus.org`);
          return true;
        } catch {
          return false;
        }
      }
    }
  ];

  const results = [];
  
  for (const list of blacklists) {
    if (list.check) {
      try {
        const isListed = await list.check();
        results.push({
          name: list.name,
          blacklisted: isListed,
          detail: isListed ? "Listed" : "Not listed"
        });
      } catch (err) {
        results.push({
          name: list.name,
          blacklisted: false,
          detail: `Error: ${err.message}`
        });
      }
    }
  }

  return results;
}

/* -------------------------
   API Route
------------------------- */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");

  if (!domain || !isValidDomain(domain)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  try {
    const availability = await checkAvailability(domain);
    const rdapData = availability.rdapData;
    const registrationStatus = availability.status;

    const registrationEvent =
      rdapData?.events?.find(e => e.eventAction === "registration");
    const expirationEvent =
      rdapData?.events?.find(e => e.eventAction === "expiration");

    const registeredAt = registrationEvent?.eventDate || null;
    const expiresAt = expirationEvent?.eventDate || null;

    const nameservers =
      rdapData?.nameservers?.map(ns => ns.ldhName?.toLowerCase()) || [];

    let ageYears = null;
    if (registeredAt) {
      ageYears = Math.floor(
        (Date.now() - new Date(registeredAt)) /
        (1000 * 60 * 60 * 24 * 365)
      );
    }

    /* -------------------------
       Wayback History
    ------------------------- */
    const cdxUrl =
      `https://web.archive.org/cdx/search/cdx?url=${domain}` +
      `&output=json&fl=timestamp,original&filter=statuscode:200&collapse=digest`;

    let snapshots = [];

    try {
      const cdxRes = await axios.get(cdxUrl);
      const raw = cdxRes.data.slice(1);
      snapshots = raw.map(([timestamp, original]) => ({
        timestamp,
        year: timestamp.slice(0, 4),
        url: `https://web.archive.org/web/${timestamp}/${original}`
      }));
    } catch {}

    const lastFiveSnapshots = snapshots.slice(-5).reverse();
    const firstArchiveYear = snapshots[0]?.year ?? null;
    const allSnapshotsUrl = `https://web.archive.org/web/*/${domain}`;

    /* -------------------------
       Drop Detection
    ------------------------- */
    let dropped = false;
    if (firstArchiveYear && registeredAt) {
      if (Number(firstArchiveYear) < new Date(registeredAt).getFullYear()) {
        dropped = true;
      }
    }

    /* -------------------------
       Scoring (Updated with Blacklist)
    ------------------------- */
    let score = 0;
    const breakdown = [];

    if (registeredAt) {
      score += 20;
      breakdown.push("+20 Active registration");
    }

    if (snapshots.length) {
      score += 30;
      breakdown.push("+30 Wayback history");
    }

    if (ageYears >= 5) {
      score += 30;
      breakdown.push("+30 Domain age ≥ 5 years");
    } else if (ageYears >= 2) {
      score += 15;
      breakdown.push("+15 Domain age ≥ 2 years");
    }

    if (dropped) {
      score -= 15;
      breakdown.push("-15 Previous drop detected");
    }

    /* -------------------------
       Blacklist Checks
    ------------------------- */
    const blacklistStatus = await checkBlacklist(domain);
    const additionalBlacklists = await checkAdditionalBlacklists(domain);
    
    // Deduct points if blacklisted
    if (blacklistStatus.blacklisted) {
      score -= 40;
      breakdown.push("-40 Blacklisted (Google Safe Browsing)");
    }

    // Check additional blacklists
    const anyAdditionalBlacklisted = additionalBlacklists.some(list => list.blacklisted);
    if (anyAdditionalBlacklisted) {
      score -= 20;
      breakdown.push("-20 Blacklisted (other security lists)");
    }

    /* -------------------------
       Final Risk Label
    ------------------------- */
    let riskLabel = "Risky";
    if (score >= 70) riskLabel = "Clean";
    else if (score >= 40) riskLabel = "Mixed";
    
    // Override to "High Risk" if blacklisted
    if (blacklistStatus.blacklisted || anyAdditionalBlacklisted) {
      riskLabel = "High Risk";
    }

    /* -------------------------
       Registrar (FIXED)
    ------------------------- */
    const registrar = extractRegistrarName(rdapData) || "Unknown";

    /* -------------------------
       TLD Availability
    ------------------------- */
    const tldAvailability = await checkTLDAvailability(domain);

    /* -------------------------
       Domain Metrics
    ------------------------- */
    const domainMetrics = await getDomainMetrics(domain);

    /* -------------------------
       Response
    ------------------------- */
    return NextResponse.json({
      domain,
      registrationStatus,
      registeredAt,
      expiresAt,
      ageYears,
      nameservers,
      registrar,

      score,
      riskLabel,
      breakdown,
      dropped,

      wayback: {
        totalSnapshots: snapshots.length,
        firstArchiveYear,
        lastFiveSnapshots,
        allSnapshotsUrl
      },

      security: {
        googleSafeBrowsing: blacklistStatus,
        additionalBlacklists,
        overallBlacklisted: blacklistStatus.blacklisted || anyAdditionalBlacklisted
      },

      tldAvailability,
      domainMetrics
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch domain data" },
      { status: 500 }
    );
  }
}