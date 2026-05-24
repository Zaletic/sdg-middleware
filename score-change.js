// GET /api/score-change?country=India
// Returns: overall score + progress field (change since 2015)
// The dataset's `progress` field = score change since 2015 baseline
// For goal-level change, we surface the Trend field (improving/declining/stagnating)

import { cors, validateCountry, arcgisUrl, extractFeatures } from "../lib/helpers.js"

const TREND_MAP = {
  "↑": "Improving",
  "↓": "Declining",
  "→": "Stagnating",
  "?": "Insufficient data",
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === "OPTIONS") return res.status(200).end()

  const { country } = req.query
  const err = validateCountry(country)
  if (err) return res.status(400).json({ error: err })

  const trendFields = Array.from({ length: 17 }, (_, i) => `Goal_${i + 1}_Trend`).join(",")

  try {
    const url = arcgisUrl(
      `Name,Region,Overall_Score,Overall_Rank,progress,${trendFields}`,
      `Name='${country}'`
    )

    const json = await fetch(url).then((r) => r.json())
    const features = extractFeatures(json)

    if (!features) {
      return res.status(404).json({ error: `No data found for "${country}"` })
    }

    const d = features[0]

    const goalTrends = Array.from({ length: 17 }, (_, i) => {
      const n = i + 1
      const raw = d[`Goal_${n}_Trend`] ?? "?"
      return {
        goal: n,
        trend: raw,
        trendLabel: TREND_MAP[raw] ?? "Unknown",
      }
    })

    return res.status(200).json({
      country: d.Name,
      region: d.Region,
      overallScore: d.Overall_Score ? parseFloat(d.Overall_Score.toFixed(2)) : null,
      overallRank: d.Overall_Rank ?? null,
      progressSince2015: d.progress ? parseFloat(d.progress.toFixed(2)) : null,
      note: "progressSince2015 measures score change from 2015 baseline. Goal trends indicate direction of recent change.",
      goalTrends,
      source: "SDSN Sustainable Development Report 2025",
    })
  } catch (e) {
    return res.status(500).json({ error: "Upstream fetch failed", detail: e.message })
  }
}
