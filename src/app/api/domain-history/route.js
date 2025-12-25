import { NextResponse } from "next/server";

function isValidDomain(domain) {
  return /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(domain);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");

  if (!domain || !isValidDomain(domain)) {
    return NextResponse.json(
      { error: "Invalid domain name" },
      { status: 400 }
    );
  }

  try {
    /* -------------------------
       RDAP (WHOIS)
    ------------------------- */
    const rdapRes = await fetch(
      `https://rdap.verisign.com/com/v1/domain/${domain}`,
      { cache: "no-store" }
    );

    const rdapData = rdapRes.ok ? await rdapRes.json() : null;

    const registrationEvent = rdapData?.events?.find(
      e => e.eventAction === "registration"
    );
    const expirationEvent = rdapData?.events?.find(
      e => e.eventAction === "expiration"
    );

    const registeredAt = registrationEvent?.eventDate || null;
    const expiresAt = expirationEvent?.eventDate || null;

    /* -------------------------
       Nameservers (FREE)
    ------------------------- */
    const nameservers =
      rdapData?.nameservers?.map(ns =>
        ns.ldhName?.toLowerCase()
      ) || [];

    /* -------------------------
       Age
    ------------------------- */
    let ageYears = null;
    if (registeredAt) {
      ageYears = Math.floor(
        (Date.now() - new Date(registeredAt)) /
          (1000 * 60 * 60 * 24 * 365)
      );
    }

    /* -------------------------
       Wayback
    ------------------------- */
    const cdxUrl =
      `https://web.archive.org/cdx/search/cdx?url=${domain}` +
      `&output=json&fl=timestamp,original&filter=statuscode:200&collapse=digest`;

    const cdxRes = await fetch(cdxUrl, { cache: "no-store" });
    const cdxData = cdxRes.ok ? await cdxRes.json() : [];

    const snapshotsRaw = cdxData.slice(1);

    const snapshots = snapshotsRaw.map(([timestamp, original]) => ({
      timestamp,
      year: timestamp.slice(0, 4),
      url: `https://web.archive.org/web/${timestamp}/${original}`
    }));

    const lastFiveSnapshots = snapshots.slice(-5).reverse();
    const allSnapshotsUrl = `https://web.archive.org/web/*/${domain}`;

    /* -------------------------
       Drop Detection
    ------------------------- */
    let dropped = false;
    let firstArchiveYear = null;

    if (snapshots.length && registeredAt) {
      firstArchiveYear = Number(snapshots[0].year);
      const regYear = new Date(registeredAt).getFullYear();
      if (firstArchiveYear < regYear) dropped = true;
    }

    /* -------------------------
       Scoring
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

    let riskLabel = "Risky";
    if (score >= 70) riskLabel = "Clean";
    else if (score >= 40) riskLabel = "Mixed";

    return NextResponse.json({
      domain,
      score,
      riskLabel,
      breakdown,
      registeredAt,
      expiresAt,
      ageYears,
      dropped,
      nameservers,
      wayback: {
        totalSnapshots: snapshots.length,
        firstArchiveYear,
        lastFiveSnapshots,
        allSnapshotsUrl
      },
      registrar: rdapData?.registrar?.name || "Unknown"
    });

  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch domain history" },
      { status: 500 }
    );
  }
}
