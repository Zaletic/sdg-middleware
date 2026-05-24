// GET /api/sdg-performance?country=India
// Returns: all 17 SDG goal scores, ratings and trends for a country

import { cors, validateCountry, arcgisUrl, extractFeatures } from "../lib/helpers.js"

const GOAL_LABELS = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health and Well-being",
  4: "Quality Education", 5: "Gender Equality", 6: "Clean Water and Sanitation",
  7: "Affordable and Clean Energy", 8: "Decent Work and Economic Growth",
  9: "Industry, Innovation and Infrastructure", 10: "Reduced Inequalities",
  11: "Sustainable Cities and Communities", 12: "Responsible Consumption and Production",
  13: "Climate Action", 14: "Life Below Water", 15: "Life on Land",
  16: "Peace, Justice and Strong Institutions", 17: "Partnerships for the Goals",
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === "OPTIONS") return res.status(200).end()

  const { country } = req.query
  const err = validateCountry(country)
  if (err) return res.status(400).json({ error: err })

  // Build outFields — all 17 goals x 3 fields + base fields
  const goalFields = Array.from({ length: 17 }, (_, i) => {
    const n = i + 1
    return [`Goal_${n}_Score`, `Goal_${n}_Rating`, `Goal_${n}_Trend`]
  }).flat().join(",")

  try {
    const url = arcgisUrl(
      `Name,Overall_Score,Overall_Rank,Region,${goalFields}`,
      `Name='${country}'`
    )

    const json = await fetch(url).then((r) => r.json())
    const features = extractFeatures(json)

    if (!features) {
      return res.status(404).json({ error: `No data found for "${country}"` })
    }

    const d = features[0]

    const goals = Array.from({ length: 17 }, (_, i) => {
      const n = i + 1
      return {
        goal: n,
        label: GOAL_LABELS[n],
        score: d[`Goal_${n}_Score`] ? parseFloat(d[`Goal_${n}_Score`].toFixed(2)) : null,
        rating: d[`Goal_${n}_Rating`] ?? null,
        trend: d[`Goal_${n}_Trend`] ?? null,
      }
    })

    return res.status(200).json({
      country: d.Name,
      region: d.Region,
      overallScore: d.Overall_Score ? parseFloat(d.Overall_Score.toFixed(2)) : null,
      overallRank: d.Overall_Rank ?? null,
      goals,
      source: "SDSN Sustainable Development Report 2025",
    })
  } catch (e) {
    return res.status(500).json({ error: "Upstream fetch failed", detail: e.message })
  }
}
