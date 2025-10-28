import React from 'react'
import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'

type Props = {
  data: any
}

function extractName(props: any): string {
  const html: string | undefined = props?.Description
  if (typeof html === 'string') {
    const m = html.match(/<th>NAME<\/th>\s*<td>([^<]+)<\/td>/i)
    if (m && m[1]) return m[1].trim()
  }
  return 'Hawker Centre'
}

export default function HawkerCentresLayer({ data }: Props){
  const icon = L.icon({
    iconUrl: '/icons/hawker.svg',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })

  const pointToLayer = (feature: any, latlng: L.LatLng) => {
    return L.marker(latlng, { icon })
  }

  const onEachFeature = (feature: any, layer: any) => {
    const name = extractName(feature?.properties)
    layer.bindTooltip(name, { sticky: true, direction: 'top', opacity: 0.95 })
  }

  return (
    <GeoJSON data={data as any} pointToLayer={pointToLayer as any} onEachFeature={onEachFeature as any} />
  )
}


