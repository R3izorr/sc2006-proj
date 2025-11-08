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

function mixColorScale(t: number){
  // More varied color scale with 5 stops:
  // 0 -> dark red (#8B0000), 0.25 -> orange (#FF6347), 0.5 -> yellow (#FFD700)
  // 0.75 -> light green (#90EE90), 1 -> dark green (#006400)
  const colors = [
    { r: 0x8B, g: 0x00, b: 0x00 }, // 0.00 - dark red
    { r: 0xFF, g: 0x63, b: 0x47 }, // 0.25 - orange/tomato
    { r: 0xFF, g: 0xD7, b: 0x00 }, // 0.50 - gold/yellow
    { r: 0x90, g: 0xEE, b: 0x90 }, // 0.75 - light green
    { r: 0x00, g: 0x64, b: 0x00 }  // 1.00 - dark green
  ]
  
  const segments = colors.length - 1
  const scaledT = t * segments
  const idx = Math.floor(scaledT)
  const localT = scaledT - idx
  
  if (idx >= segments) {
    return `#${hex(colors[segments].r)}${hex(colors[segments].g)}${hex(colors[segments].b)}`
  }
  
  const c1 = colors[idx]
  const c2 = colors[idx + 1]
  const r = lerp(c1.r, c2.r, localT)
  const g = lerp(c1.g, c2.g, localT)
  const b = lerp(c1.b, c2.b, localT)
  
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

export default function HeatMapLayer({ data, selectedId, onSelect }: Props){
  const ranks = useMemo(()=>{
    const arr: number[] = []
    for(const f of (data?.features || [])){
      const p = (f as any)?.properties ?? {}
      const rank = Number(p.H_rank ?? p.h_rank)
      if(Number.isFinite(rank)) arr.push(rank)
    }
    if(arr.length === 0) return { min: 1, max: 332 }
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
    const rank = Number(props.H_rank ?? props.h_rank)
    // Reverse the normalization: rank 1 (best) -> t=1 (green), rank 332 (worst) -> t=0 (red)
    const t = clamp01(ranks.max === ranks.min ? 0.5 : 1 - (rank - ranks.min) / (ranks.max - ranks.min))
    const fillColor = mixColorScale(t)
    const selected = selectedId && id && String(id) === String(selectedId)
    return selected
      ? { ...baseStyle, weight: 2.5, color: '#000', fillColor, fillOpacity: 0.7 }
      : { ...baseStyle, fillColor }
  }

  const onEachFeature = (feature: any, layer: any) => {
    const props = feature?.properties ?? {}
    const name = props.SUBZONE_N ?? props.subzone ?? 'Unknown'
    const rank = Number(props.H_rank ?? props.h_rank ?? 0)
    const score = Number(props.H_score ?? props.h_score ?? 0)
    layer.bindTooltip(`${name}<br/>Rank: #${rank}<br/>H: ${score.toFixed(3)}`, { sticky: true, direction: 'top', opacity: 0.95 })
    layer.on('click', () => onSelect?.(feature))
  }

  return <GeoJSON data={data} style={style} onEachFeature={onEachFeature} />
}


