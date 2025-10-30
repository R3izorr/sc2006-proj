import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import L from 'leaflet'
import type { FeatureCollection, Geometry } from 'geojson'
import 'leaflet/dist/leaflet.css'
import { fetchOpportunityGeoJSON, fetchHawkerCentresGeoJSON, fetchMrtExitsGeoJSON, fetchBusStopsGeoJSON, apiLogout } from '../../services/api'
import ChoroplethLayer from './ChoroplethLayer'
import HeatMapLayer from './HeatMapLayer'
import HawkerCentresLayer from './HawkerCentresLayer'
import MrtExitsLayer from './MrtExitsLayer'
import BusStopsLayer from './BusStopsLayer'
import Toolbar from './Toolbar'
import { buildNameIndex, getSubzoneName, getPlanningAreaName, topQuantile } from '../../utils/geo'

type Props = {
  selectedId?: string | null
  onSelect?: (feature: any) => void
  searchName?: string | null
  onNamesLoaded?: (names: string[]) => void
  regionName?: string | null
  onRegionsLoaded?: (regions: string[]) => void
  onRegionIndexLoaded?: (index: Record<string,string[]>) => void
  rankTop?: 10 | 20 | 50 | null
  onRankBucketsLoaded?: (buckets: Record<'10'|'20'|'50', string[]>) => void
}

export default function MapView({ selectedId, onSelect, searchName, onNamesLoaded, regionName, onRegionsLoaded, onRegionIndexLoaded, rankTop, onRankBucketsLoaded }: Props){
  const [raw, setRaw] = useState<any>(null)
  const [filtered, setFiltered] = useState<any>(null)
  const [hawkers, setHawkers] = useState<any>(null)
  const [names, setNames] = useState<string[]>([])
  const [mrtExits, setMrtExits] = useState<any>(null)
  const [busStops, setBusStops] = useState<any>(null)
  const nameIndexRef = useRef<Map<string,string>>(new Map())
  const mapRef = useRef<L.Map | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'boundaries'|'heat'>('boundaries')
  const isAdmin = typeof window !== 'undefined' && (localStorage.getItem('userRole') || '').toLowerCase() === 'admin'
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('accessToken')

  useEffect(()=>{
    fetchOpportunityGeoJSON().then(gj => {
      setRaw(gj)
      setFiltered(gj)
      const n = gj.features.map((f:any)=> getSubzoneName(f.properties)).filter(Boolean)
      setNames(n as string[])
      nameIndexRef.current = buildNameIndex(gj.features)
      onNamesLoaded?.(n as string[])

      // Build regions and index mapping region -> subzone names
      const regionsSet = new Set<string>()
      const regionIndex: Record<string,string[]> = {}
      for(const f of gj.features){
        const p = (f as any)?.properties ?? {}
        const r = getPlanningAreaName(p)
        const s = getSubzoneName(p)
        if(r && s){
          regionsSet.add(r)
          if(!regionIndex[r]) regionIndex[r] = []
          regionIndex[r].push(s)
        }
      }
      const regions = Array.from(regionsSet).sort((a,b)=> a.localeCompare(b))
      for(const k of Object.keys(regionIndex)) regionIndex[k].sort((a,b)=> a.localeCompare(b))
      onRegionsLoaded?.(regions)
      onRegionIndexLoaded?.(regionIndex)

      // Build rank buckets
      const buckets: Record<'10'|'20'|'50', string[]> = { '10': [], '20': [], '50': [] }
      for(const f of gj.features){
        const p = (f as any)?.properties ?? {}
        const s = getSubzoneName(p)
        const rank = Number(p.H_rank ?? p.h_rank)
        if(!s || !Number.isFinite(rank)) continue
        if(rank <= 10) buckets['10'].push(s)
        if(rank <= 20) buckets['20'].push(s)
        if(rank <= 50) buckets['50'].push(s)
      }
      for(const k of Object.keys(buckets) as Array<'10'|'20'|'50'>){
        buckets[k].sort((a,b)=> a.localeCompare(b))
      }
      onRankBucketsLoaded?.(buckets)
    }).catch(console.error)
    fetchHawkerCentresGeoJSON().then(setHawkers).catch(console.error)
    fetchMrtExitsGeoJSON().then(setMrtExits).catch(console.error)
    fetchBusStopsGeoJSON().then(setBusStops).catch(console.error)
  },[])

  const center = useMemo<LatLngExpression>(()=>[1.3521, 103.8198],[])

  // --- Geometry helpers (point-in-polygon for Polygon / MultiPolygon) ---
  // Boundary is considered inside (inclusive)
  function pointOnSegment(p: [number, number], a: [number, number], b: [number, number], eps = 1e-8): boolean {
    const [px, py] = p
    const [ax, ay] = a
    const [bx, by] = b
    // Colinearity via cross product magnitude
    const cross = (py - ay) * (bx - ax) - (px - ax) * (by - ay)
    if (Math.abs(cross) > eps) return false
    // Within segment bounds via dot product
    const dot = (px - ax) * (px - bx) + (py - ay) * (py - by)
    return dot <= eps
  }

  function pointOnRing(point: [number, number], ring: number[][], eps = 1e-8): boolean {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j] as [number, number]
      const b = ring[i] as [number, number]
      if (pointOnSegment(point, a, b, eps)) return true
    }
    return false
  }

  function pointInRing(point: [number, number], ring: number[][]): boolean {
    if (pointOnRing(point, ring)) return true
    const x = point[0]
    const y = point[1]
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1]
      const xj = ring[j][0], yj = ring[j][1]
      const intersects = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi)
      if (intersects) inside = !inside
    }
    return inside
  }

  function pointInPolygon(point: [number, number], geometry: Geometry | null | undefined): boolean {
    if (!geometry) return false
    if (geometry.type === 'Polygon') {
      const coords = geometry.coordinates as number[][][]
      const outer = coords[0]
      if (!outer) return false
      if (!pointInRing(point, outer)) return false
      for (let i = 1; i < coords.length; i++) {
        // If on the hole boundary, treat as inside the polygon (inclusive)
        if (pointInRing(point, coords[i])) return false
      }
      return true
    }
    if (geometry.type === 'MultiPolygon') {
      const polys = geometry.coordinates as number[][][][]
      for (const poly of polys) {
        const outer = poly[0]
        if (!outer) continue
        if (pointInRing(point, outer)) {
          let inHole = false
          for (let i = 1; i < poly.length; i++) {
            if (pointInRing(point, poly[i])) { inHole = true; break }
          }
          if (!inHole) return true
        }
      }
      return false
    }
    return false
  }

  // Fast bbox filter before polygon test
  function geometryBBox(geometry: Geometry | null | undefined): [number, number, number, number] | null {
    if (!geometry) return null
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity
    const update = (x: number, y: number) => {
      if (x < minx) minx = x
      if (y < miny) miny = y
      if (x > maxx) maxx = x
      if (y > maxy) maxy = y
    }
    if (geometry.type === 'Polygon') {
      const coords = geometry.coordinates as number[][][]
      for (const ring of coords) for (const p of ring) update(p[0], p[1])
    } else if (geometry.type === 'MultiPolygon') {
      const polys = geometry.coordinates as number[][][][]
      for (const poly of polys) for (const ring of poly) for (const p of ring) update(p[0], p[1])
    } else {
      return null
    }
    if (!Number.isFinite(minx) || !Number.isFinite(miny) || !Number.isFinite(maxx) || !Number.isFinite(maxy)) return null
    return [minx, miny, maxx, maxy]
  }

  function pointInBBox(point: [number, number], bbox: [number, number, number, number] | null): boolean {
    if (!bbox) return false
    const [minx, miny, maxx, maxy] = bbox
    const [x, y] = point
    return x >= minx && x <= maxx && y >= miny && y <= maxy
  }

  // Selected subzone geometry (by selectedId)
  const selectedGeometry = useMemo<Geometry | null>(() => {
    if (!raw || !selectedId) return null
    const feat = (raw.features || []).find((f:any)=>{
      const p = f?.properties || {}
      const id = f?.id ?? p.SUBZONE_N ?? p.subzone
      return id && String(id) === String(selectedId)
    })
    return (feat?.geometry as Geometry) || null
  }, [raw, selectedId])

  // Filter auxiliary point layers to only points inside selected polygon
  const hawkersInSelected = useMemo<any | null>(() => {
    if (!selectedGeometry || !hawkers) return null
    const bbox = geometryBBox(selectedGeometry)
    const feats = (hawkers.features || []).filter((f:any)=>{
      const c = f?.geometry?.coordinates
      if (!Array.isArray(c) || c.length < 2) return false
      const pt: [number, number] = [Number(c[0]), Number(c[1])]
      if (!pointInBBox(pt, bbox)) return false
      return pointInPolygon(pt, selectedGeometry)
    })
    return { type: 'FeatureCollection', features: feats }
  }, [hawkers, selectedGeometry])

  const mrtInSelected = useMemo<any | null>(() => {
    if (!selectedGeometry || !mrtExits) return null
    const bbox = geometryBBox(selectedGeometry)
    const feats = (mrtExits.features || []).filter((f:any)=>{
      const c = f?.geometry?.coordinates
      if (!Array.isArray(c) || c.length < 2) return false
      const pt: [number, number] = [Number(c[0]), Number(c[1])]
      if (!pointInBBox(pt, bbox)) return false
      return pointInPolygon(pt, selectedGeometry)
    })
    return { type: 'FeatureCollection', features: feats }
  }, [mrtExits, selectedGeometry])

  // Some bus datasets store lat/lon in properties; accept either geometry or props
  function pointFromFeature(f: any): [number, number] | null {
    const props = f?.properties || {}
    const toNum = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : null }
    const latKeys = ['lat','latitude','Lat','Latitude','LAT']
    const lonKeys = ['lon','lng','long','longitude','Lon','Lng','Long','Longitude','LON','LNG']
    let lat: number | null = null, lon: number | null = null
    for(const k of latKeys){ if(props[k] !== undefined){ lat = toNum(props[k]); if(lat !== null) break } }
    for(const k of lonKeys){ if(props[k] !== undefined){ lon = toNum(props[k]); if(lon !== null) break } }
    if(lat !== null && lon !== null) return [lon, lat]
    // Fallback to geometry if looks like WGS84 lon/lat
    const c = f?.geometry?.coordinates
    if (Array.isArray(c) && c.length >= 2) {
      const x = Number(c[0]); const y = Number(c[1])
      if (Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= 180 && Math.abs(y) <= 90) {
        return [x, y]
      }
    }
    return null
  }

  function featureWithWgs84Point(f: any): any {
    const pt = pointFromFeature(f)
    if(!pt) return null
    // Clone with corrected geometry
    return {
      type: 'Feature',
      properties: { ...(f?.properties || {}) },
      geometry: { type: 'Point', coordinates: pt }
    }
  }

  const busInSelected = useMemo<any | null>(() => {
    if (!selectedGeometry || !busStops) return null
    const bbox = geometryBBox(selectedGeometry)
    const feats = (busStops.features || []).map((f:any)=>{
      const pt = pointFromFeature(f)
      if(!pt) return null
      if (!pointInBBox(pt, bbox)) return null
      if (!pointInPolygon(pt, selectedGeometry)) return null
      return featureWithWgs84Point(f)
    }).filter(Boolean)
    return { type: 'FeatureCollection', features: feats as any }
  }, [busStops, selectedGeometry])

  function handleFilter(pct: 'all'|0.5|0.25|0.1){
    if(!raw) return
    if(pct==='all') { setFiltered(raw); return }
    const feats = topQuantile(raw.features, pct)
    const fc: FeatureCollection<Geometry> = { type: 'FeatureCollection', features: feats as any }
    setFiltered(fc)
    const map = mapRef.current
    if(map && feats.length){
      const bounds = L.geoJSON(fc as any).getBounds()
      if(bounds.isValid()) map.fitBounds(bounds, { padding: [16,16] })
    }
  }

  function handleSearch(name: string){
    const map = mapRef.current
    if(!raw || !map || !name) return
    const key = nameIndexRef.current.get(name.toLowerCase())
    const feat = raw.features.find((f:any)=> getSubzoneName(f.properties) === key)
    if(!feat) return
    const fc: FeatureCollection<Geometry> = { type: 'FeatureCollection', features: [feat] as any }
    const bounds = L.geoJSON(fc as any).getBounds()
    if(bounds.isValid()) map.fitBounds(bounds, { padding: [16,16] })
    onSelect?.(feat)
  }

  // Trigger search when prop changes
  useEffect(()=>{
    if(searchName){
      handleSearch(searchName)
    }
  }, [searchName])

  // Apply combined filters (region + rank) and fit bounds
  useEffect(()=>{
    if(!raw){ return }
    let feats = raw.features as any[]
    if(regionName){
      const rn = String(regionName).toLowerCase()
      feats = feats.filter((f:any)=> String(getPlanningAreaName(f?.properties ?? {})).toLowerCase() === rn)
    }
    if(rankTop){
      const top = Number(rankTop)
      feats = feats.filter((f:any)=> Number((f?.properties ?? {}).H_rank ?? (f?.properties ?? {}).h_rank) <= top)
    }
    const fc: FeatureCollection<Geometry> = { type: 'FeatureCollection', features: feats as any }
    setFiltered(fc)
    const map = mapRef.current
    if(map && feats.length){
      const bounds = L.geoJSON(fc as any).getBounds()
      if(bounds.isValid()) map.fitBounds(bounds, { padding: [16,16] })
    }
  }, [regionName, rankTop, raw])

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <MapContainer center={center} zoom={11} style={{ height: '100%' }} ref={mapRef as any}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" {...({ attribution: '© OpenStreetMap' } as any)} />
        {filtered && (viewMode==='boundaries' ? (
          <ChoroplethLayer data={filtered} selectedId={selectedId} onSelect={onSelect} />
        ) : (
          <HeatMapLayer data={filtered} selectedId={selectedId} onSelect={onSelect} />
        ))}
        {/* Only render points within selected subzone; hide when none selected */}
        {hawkersInSelected && hawkersInSelected.features.length > 0 && (
          <HawkerCentresLayer key={`hawkers-${selectedId ?? 'none'}`} data={hawkersInSelected} />
        )}
        {mrtInSelected && mrtInSelected.features.length > 0 && (
          <MrtExitsLayer key={`mrt-${selectedId ?? 'none'}`} data={mrtInSelected} />
        )}
        {busInSelected && busInSelected.features.length > 0 && (
          <BusStopsLayer key={`bus-${selectedId ?? 'none'}`} data={busInSelected} />
        )}
      </MapContainer>
      <Toolbar names={names} onSearch={handleSearch} onFilter={handleFilter} />
      {/* Settings dropdown (top-right) */}
      {isLoggedIn && (
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1000, display: 'flex', gap: 8 }}>
        {/* Admin console (only for admins) */}
        {isAdmin && (
          <button onClick={()=>{ window.location.hash = '#/admin' }} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm opacity-90 hover:opacity-100">Admin Console</button>
        )}
        {/* View options */}
        <div style={{ position: 'relative' }}>
          <button onClick={()=> setViewOpen(o=>!o)} className="px-3 py-1.5 rounded bg-gray-700 text-white text-sm opacity-90 hover:opacity-100">View</button>
          {viewOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded shadow">
              <button onClick={()=>{ setViewMode('boundaries'); setViewOpen(false) }} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${viewMode==='boundaries' ? 'bg-gray-50' : ''}`}>Boundaries</button>
              <button onClick={()=>{ setViewMode('heat'); setViewOpen(false) }} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${viewMode==='heat' ? 'bg-gray-50' : ''}`}>Heat Map</button>
            </div>
          )}
        </div>
        {/* Settings */}
        <div style={{ position: 'relative' }}>
          <button onClick={()=> setMenuOpen(o=>!o)} className="px-3 py-1.5 rounded bg-gray-800 text-white text-sm opacity-90 hover:opacity-100">Settings</button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow">
              <button onClick={()=>{ setMenuOpen(false); window.location.hash = '#/profile' }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Profile</button>
              <button onClick={async()=>{ setMenuOpen(false); const rt = localStorage.getItem('refreshToken') || ''; await apiLogout(rt); localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('userEmail'); localStorage.removeItem('userRole'); window.location.replace('#/login') }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Logout</button>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}


