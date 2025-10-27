import React from 'react'
import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'

type Props = {
  data: any
}

function extractStation(props: any): string {
  const html: string | undefined = props?.Description
  if (typeof html === 'string') {
    const m = html.match(/<th>STATION_NA<\/th>\s*<td>([^<]+)<\/td>/i)
    if (m && m[1]) return m[1].trim()
  }
  return 'MRT Station'
}

function extractExit(props: any): string | null {
  const html: string | undefined = props?.Description
  if (typeof html === 'string') {
    const m = html.match(/<th>EXIT_CODE<\/th>\s*<td>([^<]+)<\/td>/i)
    if (m && m[1]) return m[1].trim()
  }
  return null
}

export default function MrtExitsLayer({ data }: Props){
  const icon = L.icon({
    iconUrl: '/icons/mrt-exit.svg',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })

  const pointToLayer = (feature: any, latlng: L.LatLng) => L.marker(latlng, { icon })

  const onEachFeature = (feature: any, layer: any) => {
    const station = extractStation(feature?.properties)
    const exit = extractExit(feature?.properties)
    const label = exit ? `${station} — ${exit}` : station
    layer.bindTooltip(label, { sticky: true, direction: 'top', opacity: 0.95 })
  }

  return <GeoJSON data={data as any} pointToLayer={pointToLayer as any} onEachFeature={onEachFeature as any} />
}


