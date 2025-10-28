import React, { useEffect, useMemo, useState } from 'react'
import { fetchOpportunityGeoJSON } from '../../services/api'

function parseIds(): string[] {
  const hash = window.location.hash || ''
  const q = hash.split('?')[1] || ''
  const params = new URLSearchParams(q)
  const ids = (params.get('ids') || '').split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean)
  return ids.slice(0, 2)
}

export default function ComparisonPage(){
  const [gj, setGj] = useState<any | null>(null)
  const [ids, setIds] = useState<string[]>(parseIds())

  useEffect(()=>{
    const onHash = () => setIds(parseIds())
    window.addEventListener('hashchange', onHash)
    return ()=> window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(()=>{ fetchOpportunityGeoJSON().then(setGj).catch(console.error) }, [])

  const items = useMemo(()=>{
    if(!gj) return [] as any[]
    const list: any[] = []
    for(const id of ids){
      const f = gj.features.find((f:any)=>{
        const p = f?.properties ?? {}
        const fid = f?.id ?? p.SUBZONE_N ?? p.subzone
        return String(fid) === String(id)
      })
      if(f) list.push(f)
    }
    return list
  }, [gj, ids])

  function goBack(){ window.location.hash = '' }

  return (
    <div className="h-full p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h1 className="m-0 text-[20px] font-semibold">Comparison</h1>
          <button onClick={goBack} className="px-3 py-1 border rounded">Back to Map</button>
        </div>

        {/* Titles aligned over the two value columns */}
        <div className="grid grid-cols-[240px_1fr_1fr] gap-3 mb-3 items-stretch">
          <div />
          {[0,1].map(i => {
            const f = items[i]
            const p = f?.properties ?? {}
            const title = p.SUBZONE_N ?? p.subzone ?? '—'
            const rankVal = p.H_rank ?? p.h_rank
            return (
              <div key={i} className="border border-gray-200 rounded-lg p-3">
                <div className="font-semibold">{title}</div>
                <div className="text-xs text-gray-500">Rank {rankVal ?? '—'}</div>
              </div>
            )
          })}
        </div>

        {/* Side-by-side metric rows */}
        <div className="border border-gray-200 rounded-lg p-3 mb-3">
          {renderCompareRows(items)}
        </div>

        {/* Grouped bar chart for age groups */}
        <div className="border border-gray-200 rounded-lg p-3 flex justify-center overflow-auto">
          <div className="text-sm font-semibold mb-2">Population by age group</div>
          <div className="w-full flex justify-center">
            <AgeGroupChart items={items} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string, value: string }){
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}

function fmtNum(v: any){
  if(v === null || v === undefined) return '—'
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(3) : String(v)
}
function fmtInt(v: any){
  if(v === null || v === undefined) return '—'
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : String(v)
}

function renderCompareRows(items: any[]){
  const p0 = items[0]?.properties ?? {}
  const p1 = items[1]?.properties ?? {}
  const rows: Array<{ label: string, a: number | null, b: number | null, fmt: (v:any)=>string }>= [
    { label: 'H_score', a: numOrNull(p0.H_score ?? p0.h_score), b: numOrNull(p1.H_score ?? p1.h_score), fmt: fmtNum },
    { label: 'Total population', a: numOrNull(p0.population), b: numOrNull(p1.population), fmt: fmtInt },
    { label: 'No. of MRT', a: numOrNull(p0.mrt), b: numOrNull(p1.mrt), fmt: fmtInt },
    { label: 'No. of Bus stops', a: numOrNull(p0.bus), b: numOrNull(p1.bus), fmt: fmtInt },
    { label: 'No. of Hawker centres', a: numOrNull(p0.hawker), b: numOrNull(p1.hawker), fmt: fmtInt },
  ]

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {rows.map(r => (
        <RowCompare key={r.label} label={r.label} a={r.a} b={r.b} fmt={r.fmt} />
      ))}
    </div>
  )
}

function RowCompare({ label, a, b, fmt }: { label: string, a: number | null, b: number | null, fmt: (v:any)=>string }){
  const aIsGreater = (a ?? -Infinity) > (b ?? -Infinity)
  const bIsGreater = (b ?? -Infinity) > (a ?? -Infinity)
  return (
    <div className="grid grid-cols-[240px_1fr_1fr] items-center py-2 gap-3">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`text-sm text-right px-2 py-1 rounded ${aIsGreater ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-800'}`}>{fmt(a)}</div>
      <div className={`text-sm text-right px-2 py-1 rounded ${bIsGreater ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-800'}`}>{fmt(b)}</div>
    </div>
  )
}

function numOrNull(v:any): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function AgeGroupChart({ items }: { items: any[] }){
  const p0 = items[0]?.properties ?? {}
  const p1 = items[1]?.properties ?? {}
  const groups = [
    { key: '0–24', a: numOrNull(p0.pop_0_25), b: numOrNull(p1.pop_0_25) },
    { key: '25–64', a: numOrNull(p0.pop_25_65), b: numOrNull(p1.pop_25_65) },
    { key: '65+', a: numOrNull(p0.pop_65plus), b: numOrNull(p1.pop_65plus) },
  ]
  const maxVal = Math.max(1, ...groups.flatMap(g => [g.a ?? 0, g.b ?? 0]))
  const width = 720
  const height = 260
  const padding = { top: 32, right: 12, bottom: 32, left: 46 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const groupGap = 24
  const barWidth = (innerW - groupGap * (groups.length - 1)) / (groups.length * 2)

  function yScale(v:number){ return innerH - (v / maxVal) * innerH }

  return (
    <div className="overflow-auto">
      <svg width={width} height={height}>
        <g transform={`translate(${padding.left},${padding.top})`}>
          {groups.map((g, gi) => {
            const gx = gi * (2 * barWidth + groupGap)
            const aH = ((g.a ?? 0) / maxVal) * innerH
            const bH = ((g.b ?? 0) / maxVal) * innerH
            const aX = gx
            const bX = gx + barWidth
            const aY = innerH - aH
            const bY = innerH - bH
            const groupCenter = gx + barWidth - 2
            return (
              <g key={g.key}>
                {/* bars */}
                <rect x={aX} y={aY} width={barWidth - 4} height={aH} fill="#60a5fa" />
                <rect x={bX} y={bY} width={barWidth - 4} height={bH} fill="#f97316" />
                {/* labels */}
                <text x={aX + (barWidth-4)/2} y={Math.max(12, aY - 6)} textAnchor="middle" fontSize="11" fill="#111827">{fmtInt(g.a)}</text>
                <text x={bX + (barWidth-4)/2} y={Math.max(12, bY - 6)} textAnchor="middle" fontSize="11" fill="#111827">{fmtInt(g.b)}</text>
                <text x={groupCenter} y={innerH + 18} textAnchor="middle" fontSize="12" fill="#6b7280">{g.key}</text>
              </g>
            )
          })}
          {/* y-axis ticks */}
          {[0,0.25,0.5,0.75,1].map(t => {
            const y = innerH - t * innerH
            const val = Math.round(maxVal * t)
            return (
              <g key={t}>
                <line x1={-6} y1={y} x2={innerW} y2={y} stroke="#e5e7eb" strokeWidth={1} />
                <text x={-10} y={y+3} fontSize="10" fill="#6b7280" textAnchor="end">{val.toLocaleString()}</text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}


