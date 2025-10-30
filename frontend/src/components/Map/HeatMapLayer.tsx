import React, { useMemo } from 'react'
import { GeoJSON } from 'react-leaflet'
import type { Feature, Geometry } from 'geojson'
import type { PathOptions } from 'leaflet'

type Props = {
  data: any
  selectedId?: string | null
  onSelect?: (feature: any) => void
}

function clamp01(v: number){ return v < 0 ? 0 : (v > 1 ? 1 : v) }

function lerp(a: number, b: number, t: number){ return a + (b - a) * t }

function hex(c: number){ const h = Math.round(c).toString(16).padStart(2, '0'); return h }

function mixRedYellowGreen(t: number){
  // 0 -> red (#d73027), 0.5 -> yellow (#ffd54f), 1 -> green (#1a9850)
  const r1=0xd7,g1=0x30,b1=0x27 // red
  const r2=0xff,g2=0xd5,b2=0x4f // yellow
  const r3=0x1a,g3=0x98,b3=0x50 // green
  if(t <= 0.5){
    const tt = t / 0.5
    const r = lerp(r1, r2, tt)
    const g = lerp(g1, g2, tt)
    const b = lerp(b1, b2, tt)
    return `#${hex(r)}${hex(g)}${hex(b)}`
  } else {
    const tt = (t - 0.5) / 0.5
    const r = lerp(r2, r3, tt)
    const g = lerp(g2, g3, tt)
    const b = lerp(b2, b3, tt)
    return `#${hex(r)}${hex(g)}${hex(b)}`
  }
}

export default function HeatMapLayer({ data, selectedId, onSelect }: Props){
  const scores = useMemo(()=>{
    const arr: number[] = []
    for(const f of (data?.features || [])){
      const p = (f as any)?.properties ?? {}
      const s = Number(p.H_score ?? p.h_score)
      if(Number.isFinite(s)) arr.push(s)
    }
    if(arr.length === 0) return { min: 0, max: 1 }
    return { min: Math.min(...arr), max: Math.max(...arr) }
  }, [data])

  const baseStyle: PathOptions = {
    weight: 0.8,
    color: '#333',
    fillOpacity: 0.6,
    lineJoin: 'round',
    lineCap: 'round'
  }

  const featureId = (feature: any) => {
    const props = feature?.properties ?? {}
    return feature?.id ?? props.SUBZONE_N ?? props.subzone ?? null
  }

  const style = (feature?: Feature<Geometry>): PathOptions => {
    const id = featureId(feature)
    const props: any = (feature as any)?.properties ?? {}
    const s = Number(props.H_score ?? props.h_score)
    const t = clamp01(scores.max === scores.min ? 0.5 : (s - scores.min) / (scores.max - scores.min))
    const fillColor = mixRedYellowGreen(t)
    const selected = selectedId && id && String(id) === String(selectedId)
    return selected
      ? { ...baseStyle, weight: 2.5, color: '#000', fillColor, fillOpacity: 0.7 }
      : { ...baseStyle, fillColor }
  }

  const onEachFeature = (feature: any, layer: any) => {
    const props = feature?.properties ?? {}
    const name = props.SUBZONE_N ?? props.subzone ?? 'Unknown'
    const s = Number(props.H_score ?? props.h_score ?? 0)
    layer.bindTooltip(`${name}<br/>H: ${s.toFixed(3)}`, { sticky: true, direction: 'top', opacity: 0.95 })
    layer.on('click', () => onSelect?.(feature))
  }

  return <GeoJSON data={data} style={style} onEachFeature={onEachFeature} />
}


