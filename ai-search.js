import fetch from "node-fetch";
import xml2js from "xml2js";

export default async function handler(req, res) {
  const { query, brand, wattage, quantity, location } = req.query;

  // ===== DEALS =====
  const dealRes = await fetch(
    "https://broker-api.sunhub.com/api/v1/listing/public/deals"
  );
  const dealData = await dealRes.json();

  const deals = (dealData.deals || []).map(p => ({
    name: p.title,
    price: p.price,
    location: p.location,
    url: p.url,
    source: "deal"
  }));

  // ===== RSS =====
  const rssRes = await fetch("https://www.sunhub.com/rss-feed/rss.xml");
  const rssText = await rssRes.text();
  const rssJson = await xml2js.parseStringPromise(rssText);

  const rssProducts = (rssJson.items || []).map(p => ({
    name: p.title[0],
    price: Number(p.price?.[0] || 0),
    location: "",
    url: p.link[0],
    source: "rss"
  }));

  let products = [...deals, ...rssProducts];

  // ===== BASIC FILTER =====
  if (query) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  // ===== RANKING (avoid cheapest) =====
  products.sort((a, b) => b.price - a.price);

  res.json({ results: products.slice(0, 5) });
}
