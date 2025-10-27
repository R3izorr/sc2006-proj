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
import { buildNameIndex, getSubzoneName, topQuantile } from '../../utils/geo'

type Props = {
  selectedId?: string | null
  onSelect?: (feature: any) => void
}

export default function MapView({ selectedId, onSelect }: Props){
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


