import React, { useState } from 'react'
import { apiPasswordResetRequest } from '../../services/api'

export default function ForgotPasswordPage(){
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault()
    setBusy(true); setMsg(null); setErr(null)
    try{
      await apiPasswordResetRequest(email.trim())
      setMsg('If this email exists and is verified, a reset link has been sent.')
    } catch(e: any){
      setErr(e?.message || 'Request failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="border border-gray-200 rounded p-4 bg-white w-[420px]">
        <h1 className="text-xl font-semibold mb-3">Forgot Password</h1>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded px-2 py-1" required />
        </div>
        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
        {msg && <div className="text-sm text-green-700 mb-2">{msg}</div>}
        <button disabled={busy} className="w-full px-3 py-2 rounded text-white bg-blue-600">{busy ? 'Sending…' : 'Send reset link'}</button>
        <div className="text-sm mt-3 text-center"><a href="#/login" className="text-blue-600">Back to Sign in</a></div>
      </form>
    </div>
  )
}




