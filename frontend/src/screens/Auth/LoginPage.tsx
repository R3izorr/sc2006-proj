import React, { useState } from 'react'
import { apiLogin, type LoginResponse } from '../../services/api'

export default function LoginPage(){
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('pass123')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault()
    setBusy(true)
    try{
      const r: LoginResponse = await apiLogin(email, password)
      localStorage.setItem('accessToken', r.access_token)
      localStorage.setItem('refreshToken', r.refresh_token)
      localStorage.setItem('userEmail', r.user?.email || '')
      localStorage.setItem('userRole', r.user?.role || '')
      setError(null)
      if((r.user?.role || '').toLowerCase() === 'admin'){
        window.location.hash = '#/admin'
      } else {
        window.location.hash = '#/map'
      }
    } catch(err: any){
      setError(err?.message || 'Login failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="border border-gray-200 rounded p-4 bg-white w-[360px]">
        <h1 className="text-xl font-semibold mb-3">Sign in</h1>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded px-2 py-1" />
        </div>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded px-2 py-1" />
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <button disabled={busy} className="w-full px-3 py-2 rounded text-white bg-blue-600">{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="text-xs text-gray-500 mt-3">Admins go to Admin Console; clients go to Map.</div>
      </form>
    </div>
  )
}


