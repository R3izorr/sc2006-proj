import React from 'react'

export default function HomePage(){
  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">Hawker Opportunity Score</h1>
        <p className="text-gray-600 mb-6">Explore data-driven opportunities to open new hawker centres across Singapore. View subzone scores, demographics, nearby amenities, and compare locations.</p>
        <div className="flex gap-3">
          <a href="#/login" className="px-4 py-2 rounded bg-blue-600 text-white">Sign in</a>
          <a href="#/register" className="px-4 py-2 rounded border">Register</a>
        </div>
        <div className="mt-8 text-xs text-gray-500">
          <div>Data sources: URA Master Plan, LTA DataMall, NEA Hawker Centres.</div>
        </div>
      </div>
    </div>
  )
}


