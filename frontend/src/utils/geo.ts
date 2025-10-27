export function getSubzoneName(props: any): string | null {
  return props?.SUBZONE_N ?? props?.subzone ?? null
}

export function topQuantile(features: any[], pct: number): any[] {
  if (!features || !features.length) return []
  const vals = features
    .map(f => Number(f?.properties?.H_score ?? f?.properties?.h_score ?? 0))
    .filter(Number.isFinite)
    .sort((a,b)=>a-b)
  if (!vals.length) return []
  const idx = Math.floor((1 - pct) * (vals.length - 1))
  const cutoff = vals[idx]
  return features.filter(f => Number(f?.properties?.H_score ?? f?.properties?.h_score ?? 0) >= cutoff)
}

export function buildNameIndex(features: any[]): Map<string,string> {
  const m = new Map<string,string>()
  for (const f of features) {
    const p = f?.properties ?? {}
    const n = getSubzoneName(p)
    if (n) m.set(n.toLowerCase(), n)
  }
  return m
}
