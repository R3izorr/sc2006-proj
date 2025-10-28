import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import L from 'leaflet'
import type { FeatureCollection, Geometry } from 'geojson'
import 'leaflet/dist/leaflet.css'
import { fetchOpportunityGeoJSON, fetchHawkerCentresGeoJSON, fetchMrtExitsGeoJSON } from '../../services/api'
import ChoroplethLayer from './ChoroplethLayer'
import HawkerCentresLayer from './HawkerCentresLayer'
import MrtExitsLayer from './MrtExitsLayer'
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
  const nameIndexRef = useRef<Map<string,string>>(new Map())
  const mapRef = useRef<L.Map | null>(null)

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
  },[])

  const center = useMemo<LatLngExpression>(()=>[1.3521, 103.8198],[])

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
        {filtered && <ChoroplethLayer data={filtered} selectedId={selectedId} onSelect={onSelect} />}
        {hawkers && <HawkerCentresLayer data={hawkers} />}
        {mrtExits && <MrtExitsLayer data={mrtExits} />}
      </MapContainer>
      <Toolbar names={names} onSearch={handleSearch} onFilter={handleFilter} />
    </div>
  )
}


