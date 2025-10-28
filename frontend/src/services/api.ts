export async function fetchOpportunityGeoJSON() {
  const r = await fetch(`/data/opportunity.geojson?t=${Date.now()}`, { cache: 'no-store' })
  if (!r.ok) throw new Error('Failed to load geojson')
  return r.json()
}

export async function fetchHawkerCentresGeoJSON() {
  const r = await fetch(`/data/hawker-centres.geojson?t=${Date.now()}`, { cache: 'no-store' })
  if (!r.ok) throw new Error('Failed to load hawker centres geojson')
  return r.json()
}

export async function fetchMrtExitsGeoJSON() {
  const r = await fetch(`/data/mrt-exits.geojson?t=${Date.now()}`, { cache: 'no-store' })
  if (!r.ok) throw new Error('Failed to load MRT exits geojson')
  return r.json()
}