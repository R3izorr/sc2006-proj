import React from 'react'
import { GeoJSON } from 'react-leaflet'
import type { PathOptions } from 'leaflet'
import type { Feature, Geometry } from 'geojson'

// Border-only rendering: no fill color, just stroke

type Props = {
  data: any
  selectedId?: string | null
  onSelect?: (feature: any) => void
}

export default function ChoroplethLayer({ data, selectedId, onSelect }: Props){
  const baseStyle: PathOptions = {
    weight: 1.2,
    color: '#333',
    fillOpacity: 0,
    lineJoin: 'round',
    lineCap: 'round'
  }

  const featureId = (feature: any) => {
    const props = feature?.properties ?? {}
    return feature?.id ?? props.SUBZONE_N ?? props.subzone ?? null
  }

  const style = (feature?: Feature<Geometry>): PathOptions => {
    const id = featureId(feature)
    const selected = selectedId && id && String(id) === String(selectedId)
    return selected
      ? { ...baseStyle, weight: 3, color: '#000', fillOpacity: 0 }
      : baseStyle
  }

  const onEachFeature = (feature: any, layer: any) => {
    const props = feature?.properties ?? {}
    const name = props.SUBZONE_N ?? props.subzone ?? 'Unknown'
    const s = Number(props.H_score ?? props.h_score ?? 0)
    layer.bindTooltip(`${name}<br/>H: ${s.toFixed(3)}`, { sticky: true, direction: 'top', opacity: 0.95 })

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 2, color: '#000', fillOpacity: 0 })
      layer.bringToFront()
      layer.openTooltip()
    })
    layer.on('mouseout', () => {
      layer.setStyle(style(feature))
      layer.closeTooltip()
    })
    layer.on('click', () => {
      onSelect?.(feature)
    })
  }

  return <GeoJSON data={data} style={style} onEachFeature={onEachFeature} />
}


