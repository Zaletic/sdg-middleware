// lib/helpers.js — shared across all API routes

export const ARCGIS_BASE =
  "https://services7.arcgis.com/IyvyFk20mB7Wpc95/arcgis/rest/services/Sustainable_Development_Report_2025_(with_indicators)/FeatureServer/0/query"

export const WORLD_BANK_BASE = "https://api.worldbank.org/v2"

export function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

export function validateCountry(country) {
  if (!country) return "Missing required query param: country"
  if (typeof country !== "string") return "country must be a string"
  return null
}

export function arcgisUrl(fields, where = "1=1", orderBy = "") {
  const params = new URLSearchParams({
    where,
    outFields: fields,
    outSR: "4326",
    f: "json",
  })
  if (orderBy) params.set("orderByFields", orderBy)
  return `${ARCGIS_BASE}?${params.toString()}`
}

export function extractFeatures(json) {
  if (!json.features || json.features.length === 0) return null
  return json.features.map((f) => f.attributes)
}
