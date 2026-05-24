// GET /api/vnr-count?country=India
// Returns: number of Voluntary National Reviews submitted by a country
// Data source: https://hlpf.un.org/vnrs (no public API — maintained as static JSON)

import { cors, validateCountry } from "../lib/helpers.js"
import { VNR_DATA } from "../lib/vnr-data.js"

export default async function handler(req, res) {
  cors(res)
  if (req.method === "OPTIONS") return res.status(200).end()

  const { country } = req.query
  const err = validateCountry(country)
  if (err) return res.status(400).json({ error: err })

  const record = VNR_DATA[country]

  if (!record) {
    // Try case-insensitive fallback
    const key = Object.keys(VNR_DATA).find(
      (k) => k.toLowerCase() === country.toLowerCase()
    )
    if (!key) {
      return res.status(404).json({
        error: `No VNR data found for "${country}". Check spelling matches exactly.`,
        hint: "Use exact country name as it appears in the dataset e.g. Türkiye, Viet Nam, Congo, Dem. Rep.",
      })
    }
    const fallback = VNR_DATA[key]
    return res.status(200).json({
      country: key,
      vnrCount: fallback.count,
      yearsSubmitted: fallback.years,
      hasSubmitted: fallback.count > 0,
      source: "HLPF Voluntary National Reviews (https://hlpf.un.org/vnrs)",
    })
  }

  return res.status(200).json({
    country,
    vnrCount: record.count,
    yearsSubmitted: record.years,
    hasSubmitted: record.count > 0,
    source: "HLPF Voluntary National Reviews (https://hlpf.un.org/vnrs)",
  })
}
