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

export async function fetchBusStopsGeoJSON() {
  const r = await fetch(`/data/bus-stops.geojson?t=${Date.now()}`, { cache: 'no-store' })
  if (!r.ok) throw new Error('Failed to load bus stops geojson')
  return r.json()
}

// --- Admin/Auth API ---

export type LoginResponse = {
  access_token: string
  access_expires_at: number
  refresh_token: string
  refresh_expires_at: number
  user: { id: string, email: string, role: string }
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const r = await fetch('/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if(!r.ok) throw new Error('Login failed')
  return r.json()
}

export async function apiRegister(email: string, password: string): Promise<{ user_id: string }>{
  const r = await fetch('/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if(!r.ok){
    const msg = await r.text().catch(()=>null)
    throw new Error(msg || 'Registration failed')
  }
  return r.json()
}

export async function apiListSnapshots(token: string){
  const r = await fetch('/admin/snapshots', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if(!r.ok) throw new Error('Failed to list snapshots')
  return r.json()
}

export async function apiRefreshGeoJSON(token: string, geojson: any, note?: string){
  const r = await fetch('/admin/refresh', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ geojson, note })
  })
  if(!r.ok) throw new Error('Failed to refresh data')
  return r.json()
}

export async function apiRestoreSnapshot(token: string, snapshotId: string){
  const r = await fetch(`/admin/snapshots/${encodeURIComponent(snapshotId)}/restore`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
  })
  if(!r.ok) throw new Error('Failed to restore snapshot')
  return r.json()
}

export async function apiLogout(refreshToken: string){
  // Best-effort: revoke refresh token; ignore errors
  try{
    await fetch('/auth/logout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    })
  } catch {}
}
