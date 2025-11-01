import React, { useState } from 'react'
import { apiRegister } from '../../services/api'

export default function RegisterPage(){
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [industry, setIndustry] = useState('student')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault()
    setBusy(true)
    setOk(null)
    try{
      if (password !== password2){
        throw new Error('Passwords do not match')
      }
      const phoneOrUndef = phone.trim() ? phone.trim() : undefined
      await apiRegister(email.trim(), password, fullName.trim(), industry, phoneOrUndef)
      setError(null)
      setOk('Registration successful. Redirecting to sign in…')
      setTimeout(()=>{ window.location.hash = '#/login' }, 800)
    } catch(err: any){
      setError(err?.message || 'Registration failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="border border-gray-200 rounded p-4 bg-white w-[420px]">
        <h1 className="text-xl font-semibold mb-3">Create your account</h1>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Full Name</label>
          <input value={fullName} onChange={e=>setFullName(e.target.value)} className="w-full border rounded px-2 py-1" required />
        </div>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded px-2 py-1" required />
        </div>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded px-2 py-1" required />
        </div>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Re-enter Password</label>
          <input type="password" value={password2} onChange={e=>setPassword2(e.target.value)} className="w-full border rounded px-2 py-1" required />
        </div>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Industry</label>
          <select value={industry} onChange={e=>setIndustry(e.target.value)} className="w-full border rounded px-2 py-1" required>
            <option value="student">Student</option>
            <option value="businessmen">Businessmen</option>
          </select>
        </div>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Phone (optional)</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="+65 8xxxxxxx" />
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        {ok && <div className="text-sm text-green-700 mb-2">{ok}</div>}
        <button disabled={busy} className="w-full px-3 py-2 rounded text-white bg-blue-600">{busy ? 'Creating…' : 'Create account'}</button>
        <div className="text-xs text-gray-500 mt-3">Note: Registration creates a client account only.</div>
        <div className="text-sm mt-3 text-center">
          <a href="#/login" className="text-blue-600">Already have an account? Sign in</a>
        </div>
        <div className="mt-3 flex justify-center">
          <a href="#/home" className="px-3 py-1.5 rounded border">Back to Home</a>
        </div>
      </form>
    </div>
  )
}

