import React from 'react'
import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'

type Props = { data: any }

function extractName(props: any): string {
  // Try common fields
  const html: string | undefined = props?.Description
  if (typeof html === 'string') {
    const m = html.match(/<th>(NAME|STOP_NAME|BUS_STOP_N)<\/th>\s*<td>([^<]+)<\/td>/i)
    if (m && m[2]) return m[2].trim()
  }
  return props?.name || props?.STOP_NAME || props?.BUS_STOP_N || 'Bus Stop'
}

function extractDescription(props: any): string | null {
  const raw: any = props?.Description
  if (typeof raw === 'string') {
    // If plain text (common for LTA export), return as is
    if (!raw.includes('<th>')) return raw.trim()
    const m = raw.match(/<th>(DESCRIPTION|DESC|Description)<\/th>\s*<td>([^<]+)<\/td>/i)
    if (m && m[2]) return m[2].trim()
  }
  // Try alternate fields
  if (typeof props?.STOP_DESC === 'string') return props.STOP_DESC.trim()
  if (typeof props?.RoadName === 'string' && typeof props?.BusStopCode === 'string') {
    return `${props.RoadName} (${props.BusStopCode})`
  }
  return null
}

export default function BusStopsLayer({ data }: Props){
  const icon = L.icon({ iconUrl: '/icons/bus.svg', iconSize: [22, 22], iconAnchor: [11, 11] })
  const pointToLayer = (feature: any, latlng: L.LatLng) => L.marker(latlng, { icon })
  const onEachFeature = (feature: any, layer: any) => {
    const name = extractName(feature?.properties)
    const desc = extractDescription(feature?.properties)
    const label = desc || name
    layer.bindTooltip(label, { sticky: true, direction: 'top', opacity: 0.95 })
  }
  return <GeoJSON data={data as any} pointToLayer={pointToLayer as any} onEachFeature={onEachFeature as any} />
}


