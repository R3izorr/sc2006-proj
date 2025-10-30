import React, { useEffect, useMemo, useState } from 'react'
import { apiLogin, apiListSnapshots, apiRefreshGeoJSON, apiRestoreSnapshot, apiLogout, type LoginResponse, apiAdminListUsers, apiAdminCreateAdmin, apiAdminDeleteUser, type AdminUser } from '../../services/api'

export default function AdminPage(){
  const [token, setToken] = useState<string>(()=> localStorage.getItem('accessToken') || '')
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('pass123')
  const [note, setNote] = useState('')
  const [geojsonText, setGeojsonText] = useState('')
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const currentUserEmail = (typeof window !== 'undefined') ? (localStorage.getItem('userEmail') || '') : ''
  const [activeTab, setActiveTab] = useState<'data'|'users'>('data')
  const authed = !!token

  useEffect(()=>{
    if(!authed) return
    refreshSnapshots().catch((e:any)=> setError(e?.message || 'Failed to load snapshots'))
    refreshUsers().catch((e:any)=> setError(e?.message || 'Failed to load users'))
  }, [authed])

  async function refreshSnapshots(){
    const res = await apiListSnapshots(token)
    setSnapshots(res.snapshots || [])
  }

  async function handleLogin(e: React.FormEvent){
    e.preventDefault()
    setBusy(true)
    try{
      const r: LoginResponse = await apiLogin(email, password)
      setToken(r.access_token)
      localStorage.setItem('accessToken', r.access_token)
      localStorage.setItem('refreshToken', r.refresh_token)
      localStorage.setItem('userEmail', r.user?.email || '')
      localStorage.setItem('userRole', r.user?.role || '')
      setError(null)
      await refreshUsers()
    } catch(err: any){
      setError(err?.message || 'Login failed')
    } finally { setBusy(false) }
  }

  async function handleRefresh(){
    setBusy(true)
    try{
      let data: any
      try { data = JSON.parse(geojsonText) } catch { alert('Invalid GeoJSON JSON'); return }
      await apiRefreshGeoJSON(token, data, note || undefined)
      await refreshSnapshots()
      // warm file endpoint
      fetch('/data/opportunity.geojson?t=' + Date.now()).catch(()=>{})
    } finally { setBusy(false) }
  }

  async function handleRestore(id: string){
    setBusy(true)
    try{
      await apiRestoreSnapshot(token, id)
      await refreshSnapshots()
      fetch('/data/opportunity.geojson?t=' + Date.now()).catch(()=>{})
    } finally { setBusy(false) }
  }

  async function refreshUsers(){
    const res = await apiAdminListUsers(token)
    setUsers(res.users || [])
  }

  async function handleCreateAdmin(e: React.FormEvent){
    e.preventDefault()
    if(!createEmail || !createPassword){ setError('Email and password required'); return }
    setBusy(true)
    try{
      await apiAdminCreateAdmin(token, createEmail, createPassword)
      setCreateEmail('')
      setCreatePassword('')
      await refreshUsers()
      setError(null)
    } catch(err: any){
      setError(err?.message || 'Failed to create admin')
    } finally { setBusy(false) }
  }

  async function handleDeleteUser(id: string){
    if(!confirm('Delete this user? This action cannot be undone.')) return
    setBusy(true)
    try{
      await apiAdminDeleteUser(token, id)
      await refreshUsers()
    } catch(err: any){
      alert(err?.message || 'Failed to delete user')
    } finally { setBusy(false) }
  }

  async function logout(){
    const rt = localStorage.getItem('refreshToken') || ''
    await apiLogout(rt)
    setToken('')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userRole')
    window.location.hash = '#/login'
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="m-0 text-[20px] font-semibold">Admin</h1>
        <a href="#/map" className="text-blue-600">View Map</a>
      </div>
      {!authed ? (
        <form onSubmit={handleLogin} className="border border-gray-200 rounded p-3 max-w-md">
          <div className="mb-2">
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div className="mb-2">
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <button disabled={busy} className="px-3 py-1.5 rounded text-white bg-blue-600">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Tab buttons */}
          <div className="border border-gray-200 rounded p-2 bg-white">
            <div className="flex gap-2">
              <button
                className={`px-3 py-1.5 rounded border text-sm ${activeTab==='data' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
                onClick={()=> setActiveTab('data')}
              >Data Management</button>
              <button
                className={`px-3 py-1.5 rounded border text-sm ${activeTab==='users' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
                onClick={()=> setActiveTab('users')}
              >User Management</button>
            </div>
          </div>

          {/* Data Management tab */}
          {activeTab==='data' && (
            <>
              <div className="border border-gray-200 rounded p-3">
                <div className="text-sm font-semibold mb-2">Data Management</div>
                <div className="grid grid-cols-1 gap-2">
                  <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (optional)" className="border rounded px-2 py-1" />
                  <textarea value={geojsonText} onChange={e=>setGeojsonText(e.target.value)} placeholder="Paste FeatureCollection JSON here" className="border rounded px-2 py-1 h-40 font-mono text-xs" />
                  <div>
                    <button disabled={busy} onClick={handleRefresh} className="px-3 py-1.5 rounded text-white bg-green-600">{busy ? 'Uploading…' : 'Refresh Dataset'}</button>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded p-3">
                <div className="text-sm font-semibold mb-2">Snapshots</div>
                <div className="flex flex-col">
                  {snapshots.map(s=> (
                    <div key={s.id} className="flex items-center justify-between py-1 border-b border-gray-100">
                      <div className="text-sm">
                        <span className="font-mono">{s.id.slice(0,8)}</span>
                        <span className="text-gray-500 ml-2">{s.created_at}</span>
                        {s.is_current && <span className="ml-2 px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700">current</span>}
                      </div>
                      <div>
                        {!s.is_current && <button disabled={busy} onClick={()=>handleRestore(s.id)} className="px-2 py-1 border rounded text-sm">Restore</button>}
                      </div>
                    </div>
                  ))}
                  {snapshots.length===0 && <div className="text-sm text-gray-500">No snapshots</div>}
                </div>
              </div>
            </>
          )}

          {/* User Management tab */}
          {activeTab==='users' && (
            <div className="border border-gray-200 rounded p-3">
              <div className="text-sm font-semibold mb-2">User Management</div>
              <div className="mb-2">
                <button disabled={busy} onClick={()=>refreshUsers().catch((e:any)=>setError(e?.message || 'Failed to load users'))} className="px-2 py-1 border rounded text-sm">Reload users</button>
              </div>
              <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <input value={createEmail} onChange={e=>setCreateEmail(e.target.value)} placeholder="Admin email" className="border rounded px-2 py-1" />
                <input type="password" value={createPassword} onChange={e=>setCreatePassword(e.target.value)} placeholder="Admin password" className="border rounded px-2 py-1" />
                <button disabled={busy} className="px-3 py-1.5 rounded text-white bg-blue-600">{busy ? 'Creating…' : 'Create Admin'}</button>
              </form>
              {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-1 pr-4">Email</th>
                      <th className="py-1 pr-4">Role</th>
                      <th className="py-1 pr-4">Created</th>
                      <th className="py-1 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const isSelf = currentUserEmail && u.email.toLowerCase() === currentUserEmail.toLowerCase()
                      return (
                        <tr key={u.id} className="border-t border-gray-100">
                          <td className="py-1 pr-4 font-mono">{u.email}</td>
                          <td className="py-1 pr-4"><span className="px-2 py-0.5 rounded bg-gray-100">{u.role}</span></td>
                          <td className="py-1 pr-4">{u.created_at || '—'}</td>
                          <td className="py-1 pr-4">
                            {!isSelf && (
                              <button disabled={busy} onClick={()=>handleDeleteUser(u.id)} className="px-2 py-1 border rounded">Delete</button>
                            )}
                            {isSelf && <span className="text-xs text-gray-400">(you)</span>}
                          </td>
                        </tr>
                      )
                    })}
                    {users.length===0 && (
                      <tr><td colSpan={4} className="py-2 text-gray-500">No users</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


