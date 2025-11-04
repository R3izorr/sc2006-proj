export async function fetchOpportunityGeoJSON() {
  const token = (typeof window !== 'undefined') ? (localStorage.getItem('accessToken') || '') : ''
  const r = await fetch(`/data/opportunity.geojson?t=${Date.now()}`, {
    cache: 'no-store',
    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
  })
  if (!r.ok) throw new Error('Failed to load geojson')
  return r.json()
}

export async function fetchHawkerCentresGeoJSON() {
  const token = (typeof window !== 'undefined') ? (localStorage.getItem('accessToken') || '') : ''
  const r = await fetch(`/data/hawker-centres.geojson?t=${Date.now()}`, {
    cache: 'no-store',
    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
  })
  if (!r.ok) throw new Error('Failed to load hawker centres geojson')
  return r.json()
}

export async function fetchMrtExitsGeoJSON() {
  const token = (typeof window !== 'undefined') ? (localStorage.getItem('accessToken') || '') : ''
  const r = await fetch(`/data/mrt-exits.geojson?t=${Date.now()}`, {
    cache: 'no-store',
    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
  })
  if (!r.ok) throw new Error('Failed to load MRT exits geojson')
  return r.json()
}

export async function fetchBusStopsGeoJSON() {
  const token = (typeof window !== 'undefined') ? (localStorage.getItem('accessToken') || '') : ''
  const r = await fetch(`/data/bus-stops.geojson?t=${Date.now()}`, {
    cache: 'no-store',
    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
  })
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
  if(!r.ok){
    const errorData = await r.json().catch(() => null)
    const errorMsg = errorData?.detail || 'Login failed'
    throw new Error(errorMsg)
  }
  return r.json()
}

export async function apiRegister(email: string, password: string, display_name: string, industry: string, phone?: string): Promise<{ user_id: string }>{
  const r = await fetch('/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name, industry, phone })
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

export async function apiGoogleLogin(idToken: string): Promise<LoginResponse> {
  const r = await fetch('/auth/google', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken })
  })
  if(!r.ok){
    const errorData = await r.json().catch(() => null)
    const errorMsg = errorData?.detail || 'Google login failed'
    throw new Error(errorMsg)
  }
  return r.json()
}

// --- Email verification & password reset ---

export async function apiVerifyEmailConfirm(token: string): Promise<{ ok: boolean }>{
  const r = await fetch('/auth/verify-email/confirm', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })
  if(!r.ok){
    const msg = await r.text().catch(()=>null)
    throw new Error(msg || 'Verification failed')
  }
  return r.json()
}

export async function apiVerifyEmailResend(email: string): Promise<{ ok: boolean }>{
  const r = await fetch('/auth/verify-email/resend', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  if(!r.ok){
    const msg = await r.text().catch(()=>null)
    throw new Error(msg || 'Resend failed')
  }
  return r.json()
}

export async function apiPasswordResetRequest(email: string): Promise<{ ok: boolean }>{
  const r = await fetch('/auth/password-reset/request', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  if(!r.ok){
    const msg = await r.text().catch(()=>null)
    throw new Error(msg || 'Request failed')
  }
  return r.json()
}

export async function apiPasswordResetConfirm(token: string, newPassword: string): Promise<{ ok: boolean }>{
  const r = await fetch('/auth/password-reset/confirm', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword })
  })
  if(!r.ok){
    const msg = await r.text().catch(()=>null)
    throw new Error(msg || 'Reset failed')
  }
  return r.json()
}

// --- Admin user management ---

export type AdminUser = { id: string, email: string, role: string, created_at?: string }

export async function apiAdminListUsers(token: string): Promise<{ users: AdminUser[] }>{
  const r = await fetch('/admin/users', { headers: { 'Authorization': `Bearer ${token}` } })
  if(!r.ok) throw new Error('Failed to list users')
  return r.json()
}

// --- Profile / Me ---

export type Me = {
  id: string
  email: string
  role: string
  google_sub?: string | null
  display_name?: string | null
  industry?: string | null
  phone?: string | null
  picture_url?: string | null
}

export async function apiMe(token: string): Promise<Me> {
  const r = await fetch('/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
  if(!r.ok) throw new Error('Failed to load current user')
  return r.json()
}

export async function apiUpdateProfile(
  token: string,
  body: Partial<Pick<Me,'display_name'|'industry'|'phone'|'picture_url'>> & { current_password?: string, new_password?: string }
): Promise<Me> {
  const r = await fetch('/auth/profile', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if(!r.ok){
    const msg = await r.text().catch(()=>null)
    throw new Error(msg || 'Failed to update profile')
  }
  return r.json()
}

export async function apiAdminCreateAdmin(token: string, email: string, password: string): Promise<{ user_id: string }>{
  const r = await fetch('/admin/users', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ email, password })
  })
  if(!r.ok){
    const msg = await r.text().catch(()=>null)
    throw new Error(msg || 'Failed to create admin')
  }
  return r.json()
}

export async function apiAdminDeleteUser(token: string, userId: string): Promise<{ ok: boolean }>{
  const r = await fetch(`/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
  })
  if(!r.ok){
    const msg = await r.text().catch(()=>null)
    throw new Error(msg || 'Failed to delete user')
  }
  return r.json()
}
