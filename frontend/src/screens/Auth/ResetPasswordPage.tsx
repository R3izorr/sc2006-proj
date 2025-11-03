import React, { useState } from 'react'
import { apiPasswordResetConfirm } from '../../services/api'

export default function ResetPasswordPage(){
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault()
    setBusy(true); setMsg(null); setErr(null)
    try{
      let token = ''
      try{
        const url = new URL(window.location.href)
        token = url.searchParams.get('token') || ''
        if(!token){
          const hash = window.location.hash || ''
          const q = hash.split('?')[1] || ''
          const sp = new URLSearchParams(q)
          token = sp.get('token') || ''
        }
      } catch{}
      if(!token) throw new Error('Missing token')
      if(password !== password2) throw new Error('Passwords do not match')
      // client-side policy
      if (password.length < 8) throw new Error('Password must be at least 8 characters long')
      if (!/[A-Z]/.test(password)) throw new Error('Password must contain at least one uppercase letter')
      if (!/[a-z]/.test(password)) throw new Error('Password must contain at least one lowercase letter')
      if (!/\d/.test(password)) throw new Error('Password must contain at least one number')
      if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/.test(password)) throw new Error('Password must contain at least one special character')
      await apiPasswordResetConfirm(token, password)
      setMsg('Password reset successful. Redirecting to sign in…')
      setTimeout(()=>{ window.location.hash = '#/login' }, 1200)
    } catch(e: any){
      setErr(e?.message || 'Reset failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="border border-gray-200 rounded p-4 bg-white w-[420px]">
        <h1 className="text-xl font-semibold mb-3">Reset Password</h1>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">New Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded px-2 py-1" required />
          <div className="text-xs text-gray-500 mt-1">Min 8 chars, uppercase, lowercase, number, special char</div>
        </div>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Confirm Password</label>
          <input type="password" value={password2} onChange={e=>setPassword2(e.target.value)} className="w-full border rounded px-2 py-1" required />
        </div>
        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
        {msg && <div className="text-sm text-green-700 mb-2">{msg}</div>}
        <button disabled={busy} className="w-full px-3 py-2 rounded text-white bg-blue-600">{busy ? 'Resetting…' : 'Reset password'}</button>
      </form>
    </div>
  )
}



