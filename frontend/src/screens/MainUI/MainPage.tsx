import React, { useEffect, useMemo, useState } from 'react'
import MapView from '../../components/Map/MapView'
import { AppStateProvider } from '../../contexts/AppStateContext'
import { fetchOpportunityGeoJSON } from '../../services/api'

export default function MainPage(){
  const [selected, setSelected] = useState<any | null>(null)
  const [compare, setCompare] = useState<any[]>([])
  const [tab, setTab] = useState<'details'|'search'|'filter'|'export'>('details')
  const [searchInput, setSearchInput] = useState<string>('')
  const [searchName, setSearchName] = useState<string | null>(null)
  const [allNames, setAllNames] = useState<string[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [regionName, setRegionName] = useState<string | null>(null)
  const [regionIndex, setRegionIndex] = useState<Record<string,string[]>>({})
  const [rankTop, setRankTop] = useState<10|20|50|null>(null)
  const [rankBuckets, setRankBuckets] = useState<Record<'10'|'20'|'50', string[]>>({ '10': [], '20': [], '50': [] })
  const [raw, setRaw] = useState<any | null>(null)
  const [exporting, setExporting] = useState(false)
  const [selectedForExport, setSelectedForExport] = useState<any[]>([])
  const [trayCollapsed, setTrayCollapsed] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Load GeoJSON data for export functionality
  useEffect(()=>{
    fetchOpportunityGeoJSON().then(setRaw).catch(console.error)
  }, [])

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

  function addToExport(f: any){
    if(!f) return
    const id = itemId(f)
    if(!id) return
    setSelectedForExport(prev => {
      const exists = prev.some(item => itemId(item) === id)
      if(exists) return prev
      return [...prev, f]
    })
  }

  function removeFromExport(id: string){
    setSelectedForExport(prev => prev.filter(item => itemId(item) !== id))
  }

  function clearExportList(){
    setSelectedForExport([])
  }

  function isInExportList(f: any){
    if(!f) return false
    const id = itemId(f)
    if(!id) return false
    return selectedForExport.some(item => itemId(item) === id)
  }

  

  async function ensureXLSX(): Promise<any>{
    const w: any = window as any
    if(w.XLSX) return w.XLSX
    await new Promise<void>((resolve, reject)=>{
      const s = document.createElement('script')
      s.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js'
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Failed to load XLSX'))
      document.head.appendChild(s)
    })
    return (window as any).XLSX
  }

  async function exportSelectedSubzones(){
    if(selectedForExport.length === 0){
      alert('No subzones selected for export. Click "Add to Export" to select subzones.')
      return
    }
    if(exporting) return

    setExporting(true)
    try{
      console.log('[Excel Export] Starting export for', selectedForExport.length, 'subzones')
      const XLSX = await ensureXLSX()
      console.log('[Excel Export] XLSX library loaded')
      
      // Prepare data - one row per selected subzone
      const data = selectedForExport.map((item: any) => {
        const p = item?.properties ?? {}
        return {
          'Rank': p.H_rank ?? p.h_rank ?? '—',
          'Subzone': p.SUBZONE_N ?? p.subzone ?? '—',
          'Planning Area': p.PLN_AREA_N ?? p.planning_area ?? p.planarea ?? '—',
          'H Score': Number.isFinite(Number(p.H_score ?? p.h_score)) ? Number(p.H_score ?? p.h_score).toFixed(4) : '—',
          'Population': Number.isFinite(Number(p.population)) ? Math.round(Number(p.population)) : 0,
          'Pop 0-24': Number.isFinite(Number(p.pop_0_25)) ? Math.round(Number(p.pop_0_25)) : 0,
          'Pop 25-64': Number.isFinite(Number(p.pop_25_65)) ? Math.round(Number(p.pop_25_65)) : 0,
          'Pop 65+': Number.isFinite(Number(p.pop_65plus)) ? Math.round(Number(p.pop_65plus)) : 0,
          'MRT Stations': Number.isFinite(Number(p.mrt)) ? Math.round(Number(p.mrt)) : 0,
          'Bus Stops': Number.isFinite(Number(p.bus)) ? Math.round(Number(p.bus)) : 0,
          'Hawker Centres': Number.isFinite(Number(p.hawker)) ? Math.round(Number(p.hawker)) : 0,
        }
      })
      
      // Sort by rank
      data.sort((a, b) => {
        const aRank = a.Rank === '—' ? Infinity : Number(a.Rank)
        const bRank = b.Rank === '—' ? Infinity : Number(b.Rank)
        return aRank - bRank
      })
      
      // Create workbook and worksheet
      console.log('[Excel Export] Creating workbook...')
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Selected Subzones')
      
      // Set column widths
      ws['!cols'] = [
        {wch: 6},  // Rank
        {wch: 25}, // Subzone
        {wch: 20}, // Planning Area
        {wch: 10}, // H Score
        {wch: 12}, // Population
        {wch: 10}, // Pop 0-24
        {wch: 10}, // Pop 25-64
        {wch: 10}, // Pop 65+
        {wch: 12}, // MRT
        {wch: 12}, // Bus
        {wch: 15}, // Hawker
      ]
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0]
      const count = selectedForExport.length
      const filename = `Selected_Subzones_${count}_${timestamp}.xlsx`
      
      // Download
      console.log('[Excel Export] Downloading:', filename)
      XLSX.writeFile(wb, filename)
      console.log('[Excel Export] Success!')
    } catch(e: any){
      console.error('[Excel Export] Error:', e)
      alert(`Export failed: ${e?.message || 'Unknown error'}`)
    } finally {
      setExporting(false)
    }
  }

  async function exportToExcel(limit: number | 'all'){
    if(exporting) return
    if(!raw){
      alert('Data not loaded yet. Please wait a moment and try again.')
      return
    }

    setExporting(true)
    try{
      console.log('[Excel Export] Starting export for:', limit)
      const XLSX = await ensureXLSX()
      console.log('[Excel Export] XLSX library loaded')
      
      // Get all features and sort by rank
      let features = [...(raw.features || [])]
      console.log('[Excel Export] Total features:', features.length)
      
      features = features.filter((f:any)=>{
        const p = f?.properties ?? {}
        const rankVal = Number(p.H_rank ?? p.h_rank)
        return Number.isFinite(rankVal)
      })
      console.log('[Excel Export] Features with valid ranks:', features.length)
      
      features.sort((a:any, b:any)=>{
        const aRank = Number(a?.properties?.H_rank ?? a?.properties?.h_rank)
        const bRank = Number(b?.properties?.H_rank ?? b?.properties?.h_rank)
        return aRank - bRank
      })
      
      // Apply limit if not 'all'
      if(limit !== 'all'){
        features = features.slice(0, limit)
      }
      console.log('[Excel Export] Exporting features:', features.length)
      
      // Prepare data for Excel
      const data = features.map((f:any, idx:number)=>{
        const p = f?.properties ?? {}
        return {
          'Rank': p.H_rank ?? p.h_rank ?? '—',
          'Subzone': p.SUBZONE_N ?? p.subzone ?? '—',
          'Planning Area': p.PLN_AREA_N ?? p.planning_area ?? p.planarea ?? '—',
          'H Score': Number.isFinite(Number(p.H_score ?? p.h_score)) ? Number(p.H_score ?? p.h_score).toFixed(4) : '—',
          'Population': Number.isFinite(Number(p.population)) ? Math.round(Number(p.population)) : 0,
          'Pop 0-24': Number.isFinite(Number(p.pop_0_25)) ? Math.round(Number(p.pop_0_25)) : 0,
          'Pop 25-64': Number.isFinite(Number(p.pop_25_65)) ? Math.round(Number(p.pop_25_65)) : 0,
          'Pop 65+': Number.isFinite(Number(p.pop_65plus)) ? Math.round(Number(p.pop_65plus)) : 0,
          'MRT Stations': Number.isFinite(Number(p.mrt)) ? Math.round(Number(p.mrt)) : 0,
          'Bus Stops': Number.isFinite(Number(p.bus)) ? Math.round(Number(p.bus)) : 0,
          'Hawker Centres': Number.isFinite(Number(p.hawker)) ? Math.round(Number(p.hawker)) : 0,
        }
      })
      
      // Create workbook and worksheet
      console.log('[Excel Export] Creating workbook...')
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Hawker Opportunities')
      
      // Set column widths
      ws['!cols'] = [
        {wch: 6},  // Rank
        {wch: 25}, // Subzone
        {wch: 20}, // Planning Area
        {wch: 10}, // H Score
        {wch: 12}, // Population
        {wch: 10}, // Pop 0-24
        {wch: 10}, // Pop 25-64
        {wch: 10}, // Pop 65+
        {wch: 12}, // MRT
        {wch: 12}, // Bus
        {wch: 15}, // Hawker
      ]
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0]
      const limitStr = limit === 'all' ? 'All' : `Top${limit}`
      const filename = `Hawker_Opportunities_${limitStr}_${timestamp}.xlsx`
      
      // Download
      console.log('[Excel Export] Downloading:', filename)
      XLSX.writeFile(wb, filename)
      console.log('[Excel Export] Success!')
    } catch(e: any){
      console.error('[Excel Export] Error:', e)
      alert(`Export failed: ${e?.message || 'Unknown error'}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <AppStateProvider>
      <div className="h-full relative">
        <MapView selectedId={selectedId as any} onSelect={setSelected} searchName={searchName} onNamesLoaded={setAllNames} regionName={regionName} onRegionsLoaded={setRegions} onRegionIndexLoaded={setRegionIndex} rankTop={rankTop} onRankBucketsLoaded={setRankBuckets} hideToolbar={true} />

        {/* Sidebar Toggle Button - moves with sidebar */}
        <div className={`absolute top-1/2 transform -translate-y-1/2 z-[1001] transition-all duration-300 ${sidebarCollapsed ? 'left-2' : 'left-[422px]'}`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="bg-white rounded-r-md shadow px-2 py-6 hover:bg-gray-50 flex items-center gap-1 text-sm text-gray-600 border border-l-0"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>

        {/* Left tray - slides in/out with animation */}
        <div className={`absolute top-2 bottom-2 w-[420px] bg-white rounded-xl shadow px-5 py-3 z-[1000] flex flex-col justify-between gap-2 overflow-auto transition-all duration-300 ${sidebarCollapsed ? 'left-[-420px]' : 'left-2'}`}>
          {/* Logo and website name at the top */}
          <div className="flex flex-col items-center justify-center mt-2 mb-4">
            <a
              href="#/"
              className="flex items-center gap-2 mb-2 justify-start w-full hover:opacity-80 transition-opacity"
            >
              <img
                src="/images/hawker-logo.png"
                alt="Hawkerrr Logo"
                className="w-8 h-8 object-contain rounded"
              />
              <span className="font-bold text-lg text-gray-800" style={{ fontFamily: "Montserrat, sans-serif" }}>Hawkerrr</span>
            </a>
          </div>
          {/* Tabs row */}
          <div className="grid grid-cols-4 gap-0 border-b border-gray-200 pb-1 text-sm mb-1">
            <button
              className={`py-2 px-3 font-semibold flex flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                tab === "details"
                  ? "bg-violet-100 text-violet-700 rounded-md shadow-sm"
                  : "text-gray-400 hover:bg-gray-50 rounded-md"
              }`}
              onClick={() => setTab("details")}
            >
              <img
                src="/icons/details_icon.png"
                alt="Details"
                className="w-5 h-5"
              />
              <span>Details</span>
            </button>
            <button
              className={`py-2 px-3 font-semibold flex flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                tab === "search"
                  ? "bg-violet-100 text-violet-700 rounded-md shadow-sm"
                  : "text-gray-400 hover:bg-gray-50 rounded-md"
              }`}
              onClick={() => setTab("search")}
            >
              <img
                src="/icons/search_icon.png"
                alt="Search"
                className="w-5 h-5"
              />
              <span>Search</span>
            </button>
            <button
              className={`py-2 px-3 font-semibold flex flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                tab === "filter"
                  ? "bg-violet-100 text-violet-700 rounded-md shadow-sm"
                  : "text-gray-400 hover:bg-gray-50 rounded-md"
              }`}
              onClick={() => setTab("filter")}
            >
              <img
                src="/icons/filter_icon.png"
                alt="Filter"
                className="w-5 h-5"
              />
              <span>Filter</span>
            </button>
            <button
              className={`py-2 px-3 font-semibold flex flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                tab === "export"
                  ? "bg-violet-100 text-violet-700 rounded-md shadow-sm"
                  : "text-gray-400 hover:bg-gray-50 rounded-md"
              }`}
              onClick={() => setTab("export")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export</span>
            </button>
          </div>

          {/* Tab content below */}
          <div className="flex-1">

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
                <button onClick={()=>toggleCompare(selected)} className={`w-full border py-1.5 rounded-md text-sm ${inCompare(selected) ? 'border-red-600 text-red-600 bg-red-50 hover:bg-red-100' : 'border-violet-600 text-violet-600 bg-violet-50 hover:bg-violet-100'}`}>
                  {inCompare(selected) ? '− Comparison' : '+ Comparison'}
                </button>
                <button onClick={()=>addToExport(selected)} disabled={isInExportList(selected)} className={`w-full border py-1.5 rounded-md text-sm ${isInExportList(selected) ? 'border-gray-300 text-gray-400 bg-gray-50' : 'border-green-600 text-green-700 bg-green-50 hover:bg-green-100'}`}>
                  {isInExportList(selected) ? '✓ Added' : '+ Export'}
                </button>
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
                className="px-3 py-1 border rounded text-violet-600 border-violet-600 bg-violet-50 hover:bg-violet-100 text-sm"
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

          {tab==='export' && (
          <div className="mt-3 space-y-3">
            {/* Selected Subzones Export */}
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">Export Selected Subzones ({selectedForExport.length})</div>
                {selectedForExport.length > 0 && (
                  <button onClick={clearExportList} className="text-xs text-red-600 hover:text-red-800">Clear All</button>
                )}
              </div>
              
              {selectedForExport.length > 0 ? (
                <div>
                  <div className="mb-3 space-y-2 max-h-48 overflow-y-auto">
                    {selectedForExport.map((item: any) => {
                      const p = item?.properties ?? {}
                      const itemName = p.SUBZONE_N ?? p.subzone ?? '—'
                      const itemPlanning = p.PLN_AREA_N ?? p.planning_area ?? p.planarea ?? '—'
                      const itemRank = p.H_rank ?? p.h_rank
                      const itemId = item?.id ?? p.SUBZONE_N ?? p.subzone
                      return (
                        <div key={itemId} className="p-2 bg-gray-50 rounded border border-gray-200 flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs truncate">{itemName}</div>
                            <div className="text-[10px] text-gray-500">{itemPlanning} • Rank {itemRank ?? '—'}</div>
                          </div>
                          <button 
                            onClick={()=>removeFromExport(String(itemId))} 
                            className="text-red-600 hover:text-red-800 text-xs px-1.5 py-0.5 rounded hover:bg-red-50"
                          >×</button>
                        </div>
                      )
                    })}
                  </div>
                  
                  <button 
                    onClick={exportSelectedSubzones}
                    disabled={exporting}
                    className="w-full border border-violet-600 text-violet-600 bg-violet-50 hover:bg-violet-100 py-2.5 rounded-md flex items-center justify-between px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {exporting ? 'Exporting...' : `Export ${selectedForExport.length} Subzone${selectedForExport.length !== 1 ? 's' : ''}`}
                    </span>
                    <span className="text-xs bg-violet-100 px-2 py-0.5 rounded">.xlsx</span>
                  </button>

                  <div className="mt-2 p-2 bg-violet-50 rounded text-xs text-gray-600">
                    <div className="font-semibold mb-1">💡 Tip:</div>
                    <div>Click on subzones in the map, then click "+ Export" in the Details tab to add them here.</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-sm">No subzones selected</div>
                  <div className="text-xs mt-1">Click on subzones in the map</div>
                  <div className="text-xs">then click "+ Export" to add them</div>
                </div>
              )}
            </div>

            {/* Multiple Subzones Export (Excel) */}
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="text-sm font-semibold mb-3">Export Multiple Subzones</div>
              <div className="text-xs text-gray-600 mb-3">Export ranked subzone data to Excel spreadsheet</div>
              
              <div className="space-y-2">
                <button 
                  onClick={()=>exportToExcel(10)} 
                  disabled={exporting || !raw}
                  className="w-full border border-green-600 text-green-700 bg-green-50 hover:bg-green-100 py-2.5 rounded-md flex items-center justify-between px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {exporting ? 'Exporting...' : 'Top 10 Subzones'}
                  </span>
                  <span className="text-xs bg-green-100 px-2 py-0.5 rounded">.xlsx</span>
                </button>

                <button 
                  onClick={()=>exportToExcel(20)} 
                  disabled={exporting || !raw}
                  className="w-full border border-green-600 text-green-700 bg-green-50 hover:bg-green-100 py-2.5 rounded-md flex items-center justify-between px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {exporting ? 'Exporting...' : 'Top 20 Subzones'}
                  </span>
                  <span className="text-xs bg-green-100 px-2 py-0.5 rounded">.xlsx</span>
                </button>

                <button 
                  onClick={()=>exportToExcel('all')} 
                  disabled={exporting || !raw}
                  className="w-full border border-green-600 text-green-700 bg-green-50 hover:bg-green-100 py-2.5 rounded-md flex items-center justify-between px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {exporting ? 'Exporting...' : 'All Subzones'}
                  </span>
                  <span className="text-xs bg-green-100 px-2 py-0.5 rounded">.xlsx</span>
                </button>
              </div>
              
              <div className="mt-3 p-2 bg-green-50 rounded text-xs text-gray-600">
                <div className="font-semibold mb-1">📊 Excel includes:</div>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>Rank, subzone name, planning area</li>
                  <li>H Score (opportunity score)</li>
                  <li>Population breakdown by age groups</li>
                  <li>MRT stations, bus stops, hawker centres</li>
                </ul>
              </div>
            </div>
          </div>
          )}
          </div>
        </div>

        {/* Comparison tray (bottom) - Collapsible */}
        <div className={`absolute left-2 right-2 bg-white rounded-md shadow z-[1000] transition-all duration-300 ${trayCollapsed ? 'bottom-2' : 'bottom-2'}`}>
          {/* Toggle button */}
          <div className="flex items-center justify-center">
            <button 
              onClick={()=>setTrayCollapsed(!trayCollapsed)}
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-t-md shadow px-4 py-1 hover:bg-gray-50 flex items-center gap-1 text-sm text-gray-600 border border-b-0"
              aria-label={trayCollapsed ? "Expand comparison tray" : "Collapse comparison tray"}
            >
              {trayCollapsed ? (
                <>
                  <span>Comparison ({compare.length})</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Hide</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* Tray content - only show when not collapsed */}
          {!trayCollapsed && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="m-0 text-[16px] font-semibold">Comparison Tray ({compare.length}/2)</h3>
                {compare.length > 0 && (
                  <button onClick={clearCompare} className="text-sm text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50">
                    Clear All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                { [0,1].map(i => {
                  const f = compare[i]
                  const fp = f?.properties ?? {}
                  const fid = f ? (f.id ?? fp.SUBZONE_N ?? fp.subzone) : null
                  const canAddSelected = !f && selected && !inCompare(selected)
                  const fName = fp.SUBZONE_N ?? fp.subzone ?? '—'
                  const fPlanning = fp.PLN_AREA_N ?? fp.planning_area ?? fp.planarea
                  const fRank = fp.H_rank ?? fp.h_rank
                  return (
                    <div key={i} className={`border rounded-lg p-3 min-h-[100px] flex flex-col justify-between ${f ? 'border-violet-300 bg-violet-50' : 'border-gray-200 bg-gray-50'}`}>
                      {f ? (
                        <>
                          <div>
                            <div className="font-semibold text-sm mb-1">{fName}</div>
                            {fPlanning && <div className="text-xs text-gray-600 mb-1">{fPlanning}</div>}
                            {fRank && <div className="text-xs text-violet-600 font-medium">Rank {fRank}</div>}
                          </div>
                          <button onClick={()=> fid && removeCompareById(String(fid))} className="text-xs text-red-600 hover:text-red-800 py-1 px-2 rounded hover:bg-red-100 text-left">
                            × Remove
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 text-center h-full">
                          <div className="text-sm mb-2">Slot {i + 1} empty</div>
                          {canAddSelected && (
                            <button onClick={()=> addToCompare(selected)} className="text-xs px-3 py-1.5 rounded border border-violet-600 text-violet-600 bg-white hover:bg-violet-50">
                              + Add selected
                            </button>
                          )}
                          {!canAddSelected && (
                            <div className="text-xs text-gray-400">Select a subzone</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {compare.length === 2 && (
                <div className="mt-3 flex gap-2 justify-end">
                  <button
                    onClick={()=>{
                      const id1 = String(itemId(compare[0]))
                      const id2 = String(itemId(compare[1]))
                      window.location.hash = `#/compare?ids=${encodeURIComponent(id1)},${encodeURIComponent(id2)}`
                    }}
                    className="px-4 py-2 rounded text-white bg-violet-600 hover:bg-violet-700 text-sm font-medium shadow-sm"
                  >
                    Compare Subzones →
                  </button>
                </div>
              )}
              {compare.length === 1 && (
                <div className="mt-3 text-center text-xs text-gray-500">
                  Add one more subzone to compare
                </div>
              )}
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
