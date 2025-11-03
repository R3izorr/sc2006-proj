import React, { useEffect, useState } from 'react'
import { apiVerifyEmailConfirm } from '../../services/api'

export default function VerifyEmailPage(){
  const [status, setStatus] = useState<'idle'|'ok'|'err'>('idle')
  const [msg, setMsg] = useState('Verifying…')

  useEffect(()=>{
    // Support hash-based routing: #/verify-email?token=...
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
    } catch {}
    if(!token){ setStatus('err'); setMsg('Missing verification token'); return }
    apiVerifyEmailConfirm(token)
      .then(()=>{ setStatus('ok'); setMsg('Email verified. You may sign in now.') })
      .catch(e=>{ setStatus('err'); setMsg(e?.message || 'Verification failed') })
  }, [])

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded p-6 w-[420px] text-center">
        <h1 className="text-xl font-semibold mb-3">Email Verification</h1>
        <div className={status==='err' ? 'text-red-600' : 'text-gray-800'}>{msg}</div>
        <div className="mt-4"><a href="#/login" className="text-blue-600">Go to Sign in</a></div>
      </div>
    </div>
  )
}



