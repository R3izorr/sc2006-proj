import React, { useMemo, useState } from 'react'
import MapView from '../../components/Map/MapView'
import { AppStateProvider } from '../../contexts/AppStateContext'

export default function MainPage(){
  const [selected, setSelected] = useState<any | null>(null)
  const [compare, setCompare] = useState<any[]>([])
  const [tab, setTab] = useState<'details'|'search'|'filter'>('details')
  const [searchInput, setSearchInput] = useState<string>('')
  const [searchName, setSearchName] = useState<string | null>(null)
  const [allNames, setAllNames] = useState<string[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [regionName, setRegionName] = useState<string | null>(null)
  const [regionIndex, setRegionIndex] = useState<Record<string,string[]>>({})
  const [rankTop, setRankTop] = useState<10|20|50|null>(null)
  const [rankBuckets, setRankBuckets] = useState<Record<'10'|'20'|'50', string[]>>({ '10': [], '20': [], '50': [] })
  const filteredSubzones = useMemo(()=>{
    let a = allNames
    if(regionName){ a = a.filter(n => (regionIndex[regionName] ?? []).includes(n)) }
    if(rankTop){ a = a.filter(n => (rankBuckets[String(rankTop) as '10'|'20'|'50'] ?? []).includes(n)) }
    return a
  }, [allNames, regionName, rankTop, regionIndex, rankBuckets])

  const suggestions = useMemo(()=>{
    const q = searchInput.trim().toLowerCase()
    if(!q) return [] as string[]
    return allNames.filter(n => n.toLowerCase().startsWith(q)).slice(0, 8)
  }, [searchInput, allNames])

  const selectedId = useMemo(() => {
    if(!selected) return null
    const p = selected.properties || {}
    return selected.id ?? p.SUBZONE_N ?? p.subzone ?? null
  }, [selected])

  const p = selected?.properties ?? {}
  const name = p.SUBZONE_N ?? p.subzone ?? '—'
  const planning = p.PLN_AREA_N ?? p.planning_area ?? p.planarea ?? '—'
  const h = normFmt(p.H_score ?? p.h_score)
  const rank = p.H_rank ?? p.h_rank
  const pop = intFmt(p.population)
  const mrt = intFmt(p.mrt)
  const bus = intFmt(p.bus)
  const hawker = intFmt(p.hawker)
  const pop0 = Number(p.pop_0_25 ?? 0)
  const pop25 = Number(p.pop_25_65 ?? 0)
  const pop65 = Number(p.pop_65plus ?? 0)
  const popTotal = Number(p.population ?? 0)

  function itemId(f:any){
    return f?.id ?? f?.properties?.SUBZONE_N ?? f?.properties?.subzone
  }
  function inCompare(f:any){
    const id = itemId(f)
    if(!id) return false
    return compare.some(c => itemId(c) === id)
  }
  function addToCompare(f:any){
    const id = itemId(f)
    if(!id) return
    setCompare(prev => {
      const exists = prev.some(c => itemId(c) === id)
      if(exists) return prev
      if(prev.length >= 2) return [prev[1], f]
      return [...prev, f]
    })
  }
  function toggleCompare(f:any){
    if(!f) return
    if(inCompare(f)) {
      const id = itemId(f)
      setCompare(prev => prev.filter(c => itemId(c) !== id))
    } else {
      addToCompare(f)
    }
  }
  function removeCompareById(id:string){
    setCompare(prev => prev.filter(c => itemId(c) !== id))
  }
  function clearCompare(){ setCompare([]) }

  

  async function ensureJsPDF(): Promise<any>{
    const w: any = window as any
    if(w.jspdf && w.jspdf.jsPDF) return w.jspdf.jsPDF
    await new Promise<void>((resolve, reject)=>{
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Failed to load jsPDF'))
      document.head.appendChild(s)
    })
    return (window as any).jspdf.jsPDF
  }

  async function exportSubzonePdf(){
    if(!selected) return
    const jsPDF = await ensureJsPDF()
    const doc = new jsPDF()
    const pad = 14
    let y = 16
    const title = String(name || 'Subzone')
    doc.setFontSize(18); doc.text(title, pad, y); y += 8
    doc.setFontSize(11)
    doc.text(`Region: ${String(planning || '—')}`, pad, y); y += 6
    doc.text(`Rank: ${String(rank ?? '—')}`, pad, y); y += 6
    doc.text(`H_Score: ${String(h)}`, pad, y); y += 6
    doc.text(`Population (total): ${String(pop)}`, pad, y); y += 8
    doc.setFontSize(12); doc.text('Population by age group', pad, y); y += 6
    doc.setFontSize(11)
    doc.text(`0–24: ${Math.round(Number(p.pop_0_25 ?? 0)).toLocaleString()}`, pad, y); y += 6
    doc.text(`25–64: ${Math.round(Number(p.pop_25_65 ?? 0)).toLocaleString()}`, pad, y); y += 6
    doc.text(`65+: ${Math.round(Number(p.pop_65plus ?? 0)).toLocaleString()}`, pad, y); y += 8
    doc.setFontSize(12); doc.text('Nearby amenities', pad, y); y += 6
    doc.setFontSize(11)
    doc.text(`MRT exits: ${String(mrt)}`, pad, y); y += 6
    doc.text(`Bus stops: ${String(bus)}`, pad, y); y += 6
    doc.text(`Hawker centres: ${String(hawker)}`, pad, y); y += 10
    const ts = new Date().toLocaleString()
    doc.setFontSize(9); doc.text(`Generated on ${ts}`, pad, y)
    const fileSafe = title.replace(/[^a-z0-9\-_.]+/gi, '_')
    doc.save(`${fileSafe || 'subzone'}.pdf`)
  }

  return (
    <AppStateProvider>
      <div className="h-full relative">
        <MapView selectedId={selectedId as any} onSelect={setSelected} searchName={searchName} onNamesLoaded={setAllNames} regionName={regionName} onRegionsLoaded={setRegions} onRegionIndexLoaded={setRegionIndex} rankTop={rankTop} onRankBucketsLoaded={setRankBuckets} />

        {/* Left tray */}
        <div className="absolute left-2 top-2 bottom-2 w-[360px] bg-white rounded-md shadow p-3 z-[1000] overflow-auto">
          <div className="flex items-center justify-between pb-1">
            <h2 className="m-0 text-[18px] font-semibold">Explore Regions</h2>
            {selected && (
              <button aria-label="Close" onClick={()=>setSelected(null)} className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200">×</button>
            )}
          </div>
          <div className="flex gap-3 border-b border-gray-200 pb-1 text-sm">
            <button className={`${tab==='details' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`} onClick={()=>setTab('details')}>Details</button>
            <button className={`${tab==='search' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`} onClick={()=>setTab('search')}>Search</button>
            <button className={`${tab==='filter' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`} onClick={()=>setTab('filter')}>Filter</button>
          </div>

          {/* Detail / Search */}
          {tab==='details' && (
          <div className="mt-3 border border-gray-200 rounded-lg p-3 grid grid-cols-[1fr_80px] gap-x-3 items-center">
            <div>
              <div className="font-semibold mb-0.5">{name}</div>
              <div className="text-xs text-gray-500 mb-2">{planning}</div>
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Population" value={pop} />
                <Metric label="MRT" value={mrt} />
                <Metric label="Bus Stops" value={bus} />
                <Metric label="Hawker Centres" value={hawker} />
              </div>
              <div className="mt-3">
                <div className="text-xs text-gray-600 mb-1">Population by age group</div>
                <PopBars
                  pop0={pop0}
                  pop25={pop25}
                  pop65={pop65}
                  total={popTotal}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={()=>toggleCompare(selected)} className={`w-full border py-1.5 rounded-md ${inCompare(selected) ? 'border-red-600 text-red-600 bg-red-50 hover:bg-red-100' : 'border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100'}`}>
                  {inCompare(selected) ? '− Remove from Comparison' : 'Add to Comparison'}
                </button>
                <button onClick={exportSubzonePdf} className="w-full border py-1.5 rounded-md border-gray-300 hover:bg-gray-50">Export PDF</button>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Score</div>
              <div className="text-2xl font-bold">{h}</div>
              <div className="text-[11px] text-gray-400">Rank {rank ?? '—'}</div>
            </div>
          </div>
          )}

          {tab==='filter' && (
          <div className="mt-3 border border-gray-200 rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-2">Filter by region</div>
            <div className="flex gap-2 items-center">
              <select value={regionName ?? ''} onChange={e=> setRegionName(e.target.value || null)} className="flex-1 border rounded px-2 py-1 text-sm">
                <option value="">All regions</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={()=> setRegionName(null)} className="px-3 py-1 border rounded text-sm">Clear</button>
            </div>
            <div className="text-sm text-gray-600 mt-4 mb-2">Filter by rank</div>
            <div className="flex gap-2 items-center">
              <select value={rankTop ?? ''} onChange={e=> setRankTop((e.target.value ? Number(e.target.value) : null) as any)} className="flex-1 border rounded px-2 py-1 text-sm">
                <option value="">All ranks</option>
                <option value="10">Top 10</option>
                <option value="20">Top 20</option>
                <option value="50">Top 50</option>
              </select>
              <button onClick={()=> setRankTop(null)} className="px-3 py-1 border rounded text-sm">Clear</button>
            </div>
            {filteredSubzones.length > 0 && (
              <div className="mt-3">
                <div className="text-sm text-gray-600 mb-1">Subzones matching filters</div>
                <div className="border border-gray-200 rounded">
                  {filteredSubzones.map(n => (
                    <button
                      key={n}
                      onClick={()=>{ setSearchInput(n); setSearchName(n) }}
                      className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50"
                    >{n}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}

          {tab==='search' && (
          <div className="mt-3 border border-gray-200 rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-2">Search by subzone name</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={e=>setSearchInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'){ setSearchName(searchInput.trim() || null) } }}
                placeholder="e.g. TIONG BAHRU"
                className="flex-1 border rounded px-2 py-1 text-sm"
              />
              <button
                onClick={()=> setSearchName(searchInput.trim() || null)}
                className="px-3 py-1 border rounded text-blue-600 border-blue-600 bg-blue-50 hover:bg-blue-100 text-sm"
              >Search</button>
            </div>
            {suggestions.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded">
                {suggestions.map(n => (
                  <button
                    key={n}
                    onClick={()=>{ setSearchInput(n); setSearchName(n) }}
                    className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50"
                  >{n}</button>
                ))}
              </div>
            )}
            <div className="text-xs text-gray-400 mt-2">Tip: press Enter to go to the first match</div>
          </div>
          )}
        </div>

        {/* Comparison tray (bottom) */}
        <div className="absolute left-2 right-2 bottom-2 bg-white rounded-md shadow p-3 z-[1000]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="m-0 text-[16px] font-semibold">Comparison Tray (max 2)</h3>
            <button onClick={clearCompare} className="text-sm text-gray-600 hover:text-gray-900">Clear</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            { [0,1].map(i => {
              const f = compare[i]
              const fp = f?.properties ?? {}
              const fid = f ? (f.id ?? fp.SUBZONE_N ?? fp.subzone) : null
              const canAddSelected = !f && selected && !inCompare(selected)
              return (
                <div key={i} className="border border-gray-200 rounded-lg p-3 min-h-[80px] flex items-start justify-between gap-2">
                  {f ? (
                    <>
                      <div className="font-semibold">{fp.SUBZONE_N ?? fp.subzone ?? '—'}</div>
                      <button onClick={()=> fid && removeCompareById(String(fid))} className="text-sm text-red-600 hover:text-red-800">Remove</button>
                    </>
                  ) : (
                    <div className="text-gray-400 text-sm">
                      Empty slot
                      <div className="mt-2">
                        <button disabled={!canAddSelected} onClick={()=> addToCompare(selected)} className={`text-sm px-2 py-1 rounded border ${canAddSelected ? 'border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100' : 'border-gray-200 text-gray-300'}`}>Add selected</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {compare.length === 2 && (
            <div className="mt-3 text-right">
              <button
                onClick={()=>{
                  const id1 = String(itemId(compare[0]))
                  const id2 = String(itemId(compare[1]))
                  window.location.hash = `#/compare?ids=${encodeURIComponent(id1)},${encodeURIComponent(id2)}`
                }}
                className="px-3 py-1.5 border rounded text-white bg-blue-600 hover:bg-blue-700 text-sm"
              >Compare</button>
            </div>
          )}
        </div>
      </div>
    </AppStateProvider>
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

function PopBars({ pop0, pop25, pop65, total }: { pop0: number, pop25: number, pop65: number, total: number }){
  const rows = [
    { label: '0–24', value: pop0, color: 'bg-blue-500' },
    { label: '25–64', value: pop25, color: 'bg-green-500' },
    { label: '65+', value: pop65, color: 'bg-orange-500' },
  ]
  return (
    <div className="flex flex-col gap-1">
      {rows.map((r)=>{
        const pct = Math.max(0, Math.min(1, total ? r.value / total : 0))
        return (
          <div key={r.label} className="flex items-center gap-2 text-xs">
            <div className="w-12 text-gray-600">{r.label}</div>
            <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
              <div className={`${r.color} h-full`} style={{ width: `${pct*100}%` }} />
            </div>
            <div className="w-14 text-right tabular-nums">{Math.round(r.value).toLocaleString()}</div>
          </div>
        )
      })}
    </div>
  )
}

function numFmt(v: any){
  if(v === null || v === undefined) return '—'
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(3) : String(v)
}
function intFmt(v: any){
  if(v === null || v === undefined) return '—'
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : String(v)
}
function normFmt(v: any){
  if(v === null || v === undefined) return '—'
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(3) : String(v)
} 
