import React, { useMemo, useState } from 'react'

type Props = {
  names: string[]
  onSearch: (name: string) => void
  onFilter: (pct: 'all' | 0.5 | 0.25 | 0.1) => void
}

export default function Toolbar({ names, onSearch, onFilter }: Props){
  const [q, setQ] = useState('')
  const listId = 'subzones-list'
  const sorted = useMemo(()=>[...names].sort((a,b)=>a.localeCompare(b)), [names])
  return (
    <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1000, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.2)', padding: 8, borderRadius: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
      <input list={listId} placeholder="Search subzone" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') onSearch(q) }} />
      <datalist id={listId}>
        {sorted.map(n => <option key={n} value={n} />)}
      </datalist>
      <select onChange={e=> onFilter(e.target.value==='all' ? 'all' : Number(e.target.value) as 0.5|0.25|0.1)} defaultValue="all">
        <option value="all">All</option>
        <option value="0.5">Top 50%</option>
        <option value="0.25">Top 25%</option>
        <option value="0.1">Top 10%</option>
      </select>
      <button onClick={()=> onSearch(q)}>Go</button>
    </div>
  )
}
