// GET /api/overall-score?country=India
// Returns: overall SDG score, rank, region, ISO3 code for a country

import { cors, validateCountry, arcgisUrl, extractFeatures } from "../lib/helpers.js"

export default async function handler(req, res) {
  cors(res)
  if (req.method === "OPTIONS") return res.status(200).end()

  const { country } = req.query
  const err = validateCountry(country)
  if (err) return res.status(400).json({ error: err })

  try {
    const url = arcgisUrl(
      "Name,iso3,Overall_Score,Overall_Rank,Region,Spillover_Score,Spillover_Rank,progress",
      `Name='${country}'`
    )

    const json = await fetch(url).then((r) => r.json())
    const features = extractFeatures(json)

    if (!features) {
      return res.status(404).json({
        error: `No data found for "${country}". Check spelling — use exact name e.g. "Türkiye", "Viet Nam".`,
      })
    }

    const d = features[0]
    return res.status(200).json({
      country: d.Name,
      iso3: d.iso3,
      region: d.Region,
      overallScore: d.Overall_Score ? parseFloat(d.Overall_Score.toFixed(2)) : null,
      overallRank: d.Overall_Rank ?? null,
      spilloverScore: d.Spillover_Score ? parseFloat(d.Spillover_Score.toFixed(2)) : null,
      spilloverRank: d.Spillover_Rank ?? null,
      progressSince2015: d.progress ? parseFloat(d.progress.toFixed(2)) : null,
      source: "SDSN Sustainable Development Report 2025",
    })
  } catch (e) {
    return res.status(500).json({ error: "Upstream fetch failed", detail: e.message })
  }
}
