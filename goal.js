// GET /api/goal?number=3
// GET /api/goal?number=3&country=India  (filter to one country)
// Returns: all countries ranked by a specific SDG goal score
// With optional country filter for single-country goal view

import { cors, arcgisUrl, extractFeatures } from "../lib/helpers.js"

const GOAL_LABELS = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health and Well-being",
  4: "Quality Education", 5: "Gender Equality", 6: "Clean Water and Sanitation",
  7: "Affordable and Clean Energy", 8: "Decent Work and Economic Growth",
  9: "Industry, Innovation and Infrastructure", 10: "Reduced Inequalities",
  11: "Sustainable Cities and Communities", 12: "Responsible Consumption and Production",
  13: "Climate Action", 14: "Life Below Water", 15: "Life on Land",
  16: "Peace, Justice and Strong Institutions", 17: "Partnerships for the Goals",
}

const TREND_MAP = {
  "↑": "Improving", "↓": "Declining", "→": "Stagnating", "?": "Insufficient data",
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === "OPTIONS") return res.status(200).end()

  const { number, country } = req.query

  if (!number) {
    return res.status(400).json({
      error: "Missing required query param: number (1–17)",
    })
  }

  const n = parseInt(number)
  if (isNaN(n) || n < 1 || n > 17) {
    return res.status(400).json({ error: "Goal number must be between 1 and 17" })
  }

  const where = country ? `Name='${country}'` : "1=1"

  try {
    const url = arcgisUrl(
      `Name,Overall_Score,Overall_Rank,Region,Goal_${n}_Score,Goal_${n}_Rating,Goal_${n}_Trend`,
      where,
      `Goal_${n}_Score DESC`
    )

    const json = await fetch(url).then((r) => r.json())
    const features = extractFeatures(json)

    if (!features) {
      return res.status(404).json({
        error: country
          ? `No data found for "${country}"`
          : "No data returned from upstream",
      })
    }

    const results = features.map((d, idx) => ({
      goalRank: idx + 1,
      country: d.Name,
      region: d.Region,
      overallScore: d.Overall_Score ? parseFloat(d.Overall_Score.toFixed(2)) : null,
      overallRank: d.Overall_Rank ?? null,
      goalScore: d[`Goal_${n}_Score`] ? parseFloat(d[`Goal_${n}_Score`].toFixed(2)) : null,
      goalRating: d[`Goal_${n}_Rating`] ?? null,
      goalTrend: d[`Goal_${n}_Trend`] ?? null,
      goalTrendLabel: TREND_MAP[d[`Goal_${n}_Trend`]] ?? "Unknown",
    }))

    return res.status(200).json({
      goal: n,
      goalLabel: GOAL_LABELS[n],
      filteredBy: country ?? null,
      totalCountries: results.length,
      results,
      source: "SDSN Sustainable Development Report 2025",
    })
  } catch (e) {
    return res.status(500).json({ error: "Upstream fetch failed", detail: e.message })
  }
}
