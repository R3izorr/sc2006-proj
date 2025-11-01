import React, { useEffect, useRef, useState } from 'react'
import { apiLogin, apiGoogleLogin, type LoginResponse } from '../../services/api'

declare global {
  interface Window { GOOGLE_CLIENT_ID?: string; google?: any }
}

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

  const googleBtnRef = useRef<HTMLDivElement | null>(null)
  const googleInitDoneRef = useRef(false)

  useEffect(() => {
    const clientId = (window.GOOGLE_CLIENT_ID || (import.meta as any)?.env?.VITE_GOOGLE_CLIENT_ID || '').trim()

    const tryInit = () => {
      if (googleInitDoneRef.current) return
      if (!clientId || !window.google || !googleBtnRef.current) return
      try{
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: any) => {
            if(!resp?.credential) return
            setBusy(true)
            try{
              const r: LoginResponse = await apiGoogleLogin(resp.credential)
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
              setError(err?.message || 'Google login failed')
            } finally { setBusy(false) }
          }
        })
        window.google.accounts.id.renderButton(googleBtnRef.current, { theme: 'outline', size: 'large', width: 320 })
        googleInitDoneRef.current = true
      } catch {}
    }

    // Attempt immediately, then poll briefly to handle late script load
    tryInit()
    let attempts = 0
    const timer = window.setInterval(() => {
      if (googleInitDoneRef.current) { window.clearInterval(timer); return }
      attempts += 1
      tryInit()
      if (attempts > 50) window.clearInterval(timer) // ~5s
    }, 100)

    return () => { window.clearInterval(timer) }
  }, [])

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
        <div className="my-3 flex items-center justify-between text-xs text-gray-400">
          <span className="block h-px bg-gray-200 flex-1 mr-2" /> or <span className="block h-px bg-gray-200 flex-1 ml-2" />
        </div>
        <div className="flex items-center justify-center mb-2">
          <div ref={googleBtnRef} />
        </div>
        <div className="text-xs text-gray-500 mt-1">Admins go to Admin Console; clients go to Map.</div>
        <div className="text-sm mt-3 text-center">
          <a href="#/register" className="text-blue-600">Don't have an account? Create one</a>
        </div>
        <div className="mt-3 flex justify-center">
          <a href="#/home" className="px-3 py-1.5 rounded border">Back to Home</a>
        </div>
      </form>
    </div>
  )
}


