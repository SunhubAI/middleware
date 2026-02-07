import fetch from "node-fetch";
import xml2js from "xml2js";

function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function normalizeText(s) {
  return String(s || "").toLowerCase().trim();
}

export default async function handler(req, res) {
  try {
    // Support both POST body and querystring
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const query = body.query ?? req.query.query ?? "";
    const q = normalizeText(query);

    // ===== DEALS =====
    const dealRes = await fetch(
      "https://broker-api.sunhub.com/api/v1/listing/public/deals"
    );
    const dealJson = await dealRes.json();

    // API shape: { success, pagination, data: [...] }
    const dealsRaw = Array.isArray(dealJson.data) ? dealJson.data : [];

    const deals = dealsRaw.map((p) => ({
      title: p.title || "",
      price: toNumber(p.sunhub_price ?? p.price ?? p.msrp ?? 0),
      location: [p.city, p.state].filter(Boolean).join(", "),
      seller: p.brand || "",
      url: p.listing_id
        ? `https://www.sunhub.com/listing/${p.listing_id}`
        : "",
      source: "deal",
      qty: toNumber(p.totalQty ?? p.quantity ?? p.qoh?.quantity ?? 0),
      dealScore: toNumber(p.deal_score ?? 0),
      featured: Boolean(p.isFeatured)
    }));

    // ===== RSS =====
    const rssRes = await fetch("https://www.sunhub.com/rss-feed/rss.xml");
    const rssText = await rssRes.text();
    const rssJson = await xml2js.parseStringPromise(rssText, {
      explicitArray: true,
      trim: true
    });

    const rssItems =
      rssJson?.rss?.channel?.[0]?.item && Array.isArray(rssJson.rss.channel[0].item)
        ? rssJson.rss.channel[0].item
        : [];

    const rssProducts = rssItems.map((p) => ({
      title: p.title?.[0] || "",
      price: toNumber(p.price?.[0] || 0),
      location: p.location?.[0] || "",
      seller: p.brand?.[0] || "",
      url: p.link?.[0] || "",
      source: "rss",
      qty: toNumber(p.quantity?.[0] || 0),
      dealScore: 0,
      featured: false
    }));

    // Merge
    let products = [...deals, ...rssProducts];

    // ===== FILTER =====
    // Keep this simple for now: text match on title + location + seller
    if (q) {
      products = products.filter((p) => {
        const hay = normalizeText(
          `${p.title} ${p.location} ${p.seller} ${p.source}`
        );
        return hay.includes(q);
      });
    }

    // ===== RANKING =====
    // Since we do not have margin in the payload, rank by quality signals first,
    // then availability, then price. Not cheapest-first.
    products.sort((a, b) => {
      const aScore =
        (a.featured ? 100 : 0) + a.dealScore * 10 + Math.min(a.qty, 500) * 0.05;
      const bScore =
        (b.featured ? 100 : 0) + b.dealScore * 10 + Math.min(b.qty, 500) * 0.05;

      if (bScore !== aScore) return bScore - aScore;

      // If equal score, prefer higher price over lowest price
      return b.price - a.price;
    });

    // Return top 5
    res.status(200).json({
      results: products
        .filter((p) => p.title && p.url)
        .slice(0, 5)
        .map((p) => ({
          title: p.title,
          price: p.price,
          location: p.location,
          seller: p.seller,
          link: p.url,
          source: p.source
        }))
    });
  } catch (err) {
    res.status(500).json({
      error: "ai-search failed",
      details: String(err?.message || err)
    });
  }
}
