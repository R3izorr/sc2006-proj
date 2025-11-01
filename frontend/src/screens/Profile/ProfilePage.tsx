import React, { useEffect, useState } from 'react'
import { apiMe, apiUpdateProfile, type Me } from '../../services/api'

export default function ProfilePage(){
  const [me, setMe] = useState<Me | null>(null)
  const [edit, setEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const email = me?.email || (typeof window !== 'undefined' ? (localStorage.getItem('userEmail') || '') : '')
  const role = me?.role || (typeof window !== 'undefined' ? (localStorage.getItem('userRole') || '') : '')
  const name = (me?.display_name && me.display_name.trim()) ? me.display_name : (email ? email.split('@')[0] : 'User')
  const initial = name ? name[0]?.toUpperCase() : 'U'
  const industryLabel = me?.industry === 'student' ? 'Student' : me?.industry === 'businessmen' ? 'Businessmen' : (me?.industry || '—')

  useEffect(() => {
    const token = (typeof window !== 'undefined') ? (localStorage.getItem('accessToken') || '') : ''
    if(!token) return
    apiMe(token).then(setMe).catch(()=>{})
  }, [])

  const [formName, setFormName] = useState('')
  const [formIndustry, setFormIndustry] = useState('student')
  const [formPhone, setFormPhone] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [formPictureUrl, setFormPictureUrl] = useState('')

  useEffect(()=>{
    if(edit && me){
      setFormName(name || '')
      setFormIndustry(me.industry || 'student')
      setFormPhone(me.phone || '')
      setFormPictureUrl(me.picture_url || '')
      setCurrentPw('')
      setNewPw('')
    }
  }, [edit, me])

  async function handleSave(){
    const token = (typeof window !== 'undefined') ? (localStorage.getItem('accessToken') || '') : ''
    if(!token || !me) return
    setSaving(true)
    setErr(null)
    setOk(null)
    try{
      const body: any = {
        display_name: formName.trim() || null,
        industry: formIndustry || null,
        phone: formPhone.trim() || null,
      }
      if(formPictureUrl !== (me.picture_url || '')){
        body.picture_url = formPictureUrl.trim() || null
      }
      if(newPw){
        body.new_password = newPw
        if(currentPw) body.current_password = currentPw
      }
      const updated = await apiUpdateProfile(token, body)
      setMe(updated)
      setOk('Profile updated')
      setEdit(false)
    } catch(e: any){
      setErr(e?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded p-6 w-[420px] shadow">
        <div className="flex items-center gap-3 mb-4">
          {me?.picture_url ? (
            <img src={me.picture_url} alt={name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold">{initial}</div>
          )}
          <div>
            <div className="text-lg font-semibold">{name}</div>
            <div className="text-xs text-gray-500">{role || 'user'}</div>
          </div>
        </div>
        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
        {ok && <div className="text-sm text-green-700 mb-2">{ok}</div>}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-gray-600">Email</div>
            <div className="font-mono">{email || '—'}</div>
          </div>
          {!edit && <>
            <div className="flex items-center justify-between">
              <div className="text-gray-600">Name</div>
              <div>{name || '—'}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-gray-600">Industry</div>
              <div>{industryLabel}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-gray-600">Phone</div>
              <div>{me?.phone || '—'}</div>
            </div>
          </>}
          {edit && <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Name</label>
              <input value={formName} onChange={e=>setFormName(e.target.value)} className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Profile picture URL</label>
              <input value={formPictureUrl} onChange={e=>setFormPictureUrl(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="https://example.com/photo.jpg" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Industry</label>
              <select value={formIndustry} onChange={e=>setFormIndustry(e.target.value)} className="w-full border rounded px-2 py-1">
                <option value="student">Student</option>
                <option value="businessmen">Businessmen</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Phone</label>
              <input value={formPhone} onChange={e=>setFormPhone(e.target.value)} className="w-full border rounded px-2 py-1" />
            </div>
            {!me?.google_sub && <div className="pt-2">
              <div className="text-xs text-gray-500 mb-1">Change password (optional)</div>
              <input type="password" placeholder="Current password" value={currentPw} onChange={e=>setCurrentPw(e.target.value)} className="w-full border rounded px-2 py-1 mb-2" />
              <input type="password" placeholder="New password" value={newPw} onChange={e=>setNewPw(e.target.value)} className="w-full border rounded px-2 py-1" />
            </div>}
          </div>}
          {!edit && <div className="flex items-center justify-between">
            <div className="text-gray-600">Password</div>
            <div className="font-mono">********</div>
          </div>}
        </div>
        <div className="mt-6 flex justify-between">
          <a href="#/map" className="px-3 py-1.5 rounded border">Back to Map</a>
          {!edit && <button onClick={()=>setEdit(true)} className="px-3 py-1.5 rounded text-white bg-blue-600">Update profile</button>}
          {edit && <div className="flex gap-2">
            <button onClick={()=>setEdit(false)} disabled={saving} className="px-3 py-1.5 rounded border">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded text-white bg-blue-600">{saving ? 'Saving…' : 'Save changes'}</button>
          </div>}
        </div>
      </div>
    </div>
  )
}


