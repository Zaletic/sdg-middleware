// GET /api/missing-data?country=India
// Returns: which of the 17 SDG goals have null scores for this country

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

  const scoreFields = Array.from({ length: 17 }, (_, i) => `Goal_${i + 1}_Score`).join(",")

  try {
    const url = arcgisUrl(
      `Name,Region,Overall_Score,Overall_Rank,${scoreFields}`,
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
      const score = d[`Goal_${n}_Score`]
      return {
        goal: n,
        label: GOAL_LABELS[n],
        score: score ? parseFloat(score.toFixed(2)) : null,
        hasData: score !== null && score !== undefined,
      }
    })

    const missing = goals.filter((g) => !g.hasData)
    const available = goals.filter((g) => g.hasData)

    return res.status(200).json({
      country: d.Name,
      region: d.Region,
      overallScore: d.Overall_Score ? parseFloat(d.Overall_Score.toFixed(2)) : null,
      overallRank: d.Overall_Rank ?? null,
      summary: {
        totalGoals: 17,
        goalsWithData: available.length,
        goalsMissingData: missing.length,
      },
      missing,
      available,
      source: "SDSN Sustainable Development Report 2025",
    })
  } catch (e) {
    return res.status(500).json({ error: "Upstream fetch failed", detail: e.message })
  }
}
