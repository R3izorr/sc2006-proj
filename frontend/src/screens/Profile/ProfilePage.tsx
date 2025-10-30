import React from 'react'

export default function ProfilePage(){
  const email = (typeof window !== 'undefined') ? (localStorage.getItem('userEmail') || '') : ''
  const role = (typeof window !== 'undefined') ? (localStorage.getItem('userRole') || '') : ''
  const name = email ? email.split('@')[0] : 'User'
  const initial = name ? name[0]?.toUpperCase() : 'U'

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded p-6 w-[420px] shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold">{initial}</div>
          <div>
            <div className="text-lg font-semibold">{name}</div>
            <div className="text-xs text-gray-500">{role || 'user'}</div>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-gray-600">Email</div>
            <div className="font-mono">{email || '—'}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-gray-600">Password</div>
            <div className="font-mono">********</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <a href="#/map" className="px-3 py-1.5 rounded border">Back to Map</a>
        </div>
      </div>
    </div>
  )
}


