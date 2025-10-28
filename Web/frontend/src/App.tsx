import React, { useEffect, useMemo, useState } from 'react'
import MainPage from './screens/MainUI/MainPage'
import ComparisonPage from './screens/Compare/ComparisonPage'
import AdminPage from './screens/Admin/AdminPage'

function useHash(): string {
  const [hash, setHash] = useState<string>(window.location.hash || '')
  useEffect(()=>{
    const onHash = () => setHash(window.location.hash || '')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return hash
}

export default function App(){
  const hash = useHash()
  const route = useMemo(()=>{
    const h = (hash || '').replace(/^#/, '')
    if(h.startsWith('/compare')) return 'compare'
    if(h.startsWith('/admin')) return 'admin'
    return 'main'
  }, [hash])

  if(route === 'compare') return <ComparisonPage />
  if(route === 'admin') return <AdminPage />
  return <MainPage />
}


