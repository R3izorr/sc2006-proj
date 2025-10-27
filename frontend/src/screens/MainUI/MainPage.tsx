import React, { useMemo, useState } from 'react'
import MapView from '../../components/Map/MapView'
import { AppStateProvider } from '../../contexts/AppStateContext'

export default function MainPage(){
  const [selected, setSelected] = useState<any | null>(null)
  const [compare, setCompare] = useState<any[]>([])

  const selectedId = useMemo(() => {
    if(!selected) return null
    const p = selected.properties || {}
    return selected.id ?? p.SUBZONE_N ?? p.subzone ?? null
  }, [selected])

  const p = selected?.properties ?? {}
  const name = p.SUBZONE_N ?? p.subzone ?? '—'
  const planning = p.PLN_AREA_N ?? p.planning_area ?? p.planarea ?? '—'
  const h = normFmt(p.H_score ?? p.h_score)
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

  return (
    <AppStateProvider>
      <div className="h-full relative">
        <MapView selectedId={selectedId as any} onSelect={setSelected} />

        {/* Left tray */}
        <div className="absolute left-2 top-2 bottom-2 w-[360px] bg-white rounded-md shadow p-3 z-[1000] overflow-auto">
          <div className="flex items-center justify-between pb-1">
            <h2 className="m-0 text-[18px] font-semibold">Explore Regions</h2>
            {selected && (
              <button aria-label="Close" onClick={()=>setSelected(null)} className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200">×</button>
            )}
          </div>
          <div className="flex gap-3 border-b border-gray-200 pb-1 text-sm">
            <span className="text-blue-600 font-semibold">Details</span>
            <span className="text-gray-400">Search</span>
            <span className="text-gray-400">Compare</span>
          </div>

          {/* Detail card */}
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
              <div className="mt-2">
                <button onClick={()=>toggleCompare(selected)} className={`w-full border py-1.5 rounded-md ${inCompare(selected) ? 'border-red-600 text-red-600 bg-red-50 hover:bg-red-100' : 'border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100'}`}>
                  {inCompare(selected) ? '− Remove from Comparison' : '+ Add to Comparison'}
                </button>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Score</div>
              <div className="text-2xl font-bold">{h}</div>
              <div className="text-[11px] text-gray-400">Rank —</div>
            </div>
          </div>
        </div>

        {/* Comparison tray (bottom) */}
        <div className="absolute left-2 right-2 bottom-2 bg-white rounded-md shadow p-3 z-[1000]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="m-0 text-[16px] font-semibold">Comparison (max 2)</h3>
            <button onClick={clearCompare} className="text-sm text-gray-600 hover:text-gray-900">Clear</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            { [0,1].map(i => {
              const f = compare[i]
              const fp = f?.properties ?? {}
              const fid = f ? (f.id ?? fp.SUBZONE_N ?? fp.subzone) : null
              const canAddSelected = !f && selected && !inCompare(selected)
              return (
                <div key={i} className="border border-gray-200 rounded-lg p-3 min-h-[120px] flex items-start justify-between gap-2">
                  {f ? (
                    <>
                      <div>
                        <div className="font-semibold">{fp.SUBZONE_N ?? fp.subzone ?? '—'}</div>
                        <div className="text-xs text-gray-500 mb-2">{fp.PLN_AREA_N ?? fp.planning_area ?? '—'}</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <Metric label="H" value={normFmt(fp.H_score ?? fp.h_score)} />
                          <Metric label="Dem" value={numFmt(fp.Dem)} />
                          <Metric label="Sup" value={numFmt(fp.Sup)} />
                          <Metric label="Acc" value={numFmt(fp.Acc)} />
                          <Metric label="Pop" value={intFmt(fp.population)} />
                        </div>
                      </div>
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
