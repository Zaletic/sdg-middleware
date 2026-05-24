// GET /api/spi?country=IN
// country param = ISO2 country code (e.g. IN, DE, US, BR)
// Returns: Statistical Performance Index from World Bank API

import { cors, WORLD_BANK_BASE } from "../lib/helpers.js"

export default async function handler(req, res) {
  cors(res)
  if (req.method === "OPTIONS") return res.status(200).end()

  const { country } = req.query

  if (!country) {
    return res.status(400).json({
      error: "Missing required query param: country (use ISO2 code e.g. IN, DE, US)",
    })
  }

  try {
    // IQ.SPI.OVRL = Overall SPI score
    // IQ.SPI.PIL1 = Pillar 1: Data Use
    // IQ.SPI.PIL2 = Pillar 2: Data Services
    // IQ.SPI.PIL3 = Pillar 3: Data Products
    // IQ.SPI.PIL4 = Pillar 4: Data Sources
    // IQ.SPI.PIL5 = Pillar 5: Data Infrastructure
    const indicators = [
      "IQ.SPI.OVRL",
      "IQ.SPI.PIL1",
      "IQ.SPI.PIL2",
      "IQ.SPI.PIL3",
      "IQ.SPI.PIL4",
      "IQ.SPI.PIL5",
    ]

    // Fetch all SPI pillars in parallel
    const results = await Promise.all(
      indicators.map((ind) =>
        fetch(
          `${WORLD_BANK_BASE}/country/${country.toUpperCase()}/indicator/${ind}?format=json&mrv=1`
        ).then((r) => r.json())
      )
    )

    // World Bank returns [metadata, [datapoints]]
    const extract = (result) => {
      const datapoints = result[1]
      if (!datapoints || datapoints.length === 0) return null
      const latest = datapoints[0]
      return {
        value: latest.value ? parseFloat(latest.value.toFixed(2)) : null,
        year: latest.date,
      }
    }

    const [overall, pil1, pil2, pil3, pil4, pil5] = results.map(extract)

    if (!overall) {
      return res.status(404).json({
        error: `No SPI data found for country code "${country}". Use ISO2 code e.g. IN, DE, US, BR.`,
      })
    }

    return res.status(200).json({
      countryCode: country.toUpperCase(),
      spi: {
        overall,
        pillars: {
          dataUse: pil1,
          dataServices: pil2,
          dataProducts: pil3,
          dataSources: pil4,
          dataInfrastructure: pil5,
        },
      },
      note: "Uses ISO2 country codes. SPI score ranges 0–100.",
      source: "World Bank Statistical Performance Indicators",
    })
  } catch (e) {
    return res.status(500).json({ error: "Upstream fetch failed", detail: e.message })
  }
}
