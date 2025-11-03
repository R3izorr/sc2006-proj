import React, { useEffect, useMemo, useState } from 'react'
import MainPage from './screens/MainUI/MainPage'
import ComparisonPage from './screens/Compare/ComparisonPage'
import AdminPage from './screens/Admin/AdminPage'
import HomePage from './screens/Home/HomePage'
import LoginPage from './screens/Auth/LoginPage'
import RegisterPage from './screens/Auth/RegisterPage'
import ProfilePage from './screens/Profile/ProfilePage'

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
    if(h === '' || h === '/' || h.startsWith('/home')) return 'home'
    if(h.startsWith('/login')) return 'login'
    if(h.startsWith('/register')) return 'register'
    if(h.startsWith('/compare')) return 'compare'
    if(h.startsWith('/admin')) return 'admin'
    if(h.startsWith('/map')) return 'main'
    if(h.startsWith('/profile')) return 'profile'
    return 'home'
  }, [hash])

  if(route === 'home') return <HomePage />
  if(route === 'login') {
    const token = (typeof window !== 'undefined') ? localStorage.getItem('accessToken') : null
    const role = (typeof window !== 'undefined') ? (localStorage.getItem('userRole') || '').toLowerCase() : ''
    if(token){
      window.location.hash = role === 'admin' ? '#/admin' : '#/map'
      return null
    }
    return <LoginPage />
  }
  if(route === 'register') return <RegisterPage />
  if(route === 'compare') return <ComparisonPage />
  if(route === 'profile'){
    const token = (typeof window !== 'undefined') ? localStorage.getItem('accessToken') : null
    if(!token){ window.location.hash = '#/login'; return null }
    return <ProfilePage />
  }
  if(route === 'admin') {
    // Simple guard: require admin role; otherwise go to login
    const role = (localStorage.getItem('userRole') || '').toLowerCase()
    if(role !== 'admin'){
      window.location.hash = '#/login'
      return null
    }
    return <AdminPage />
  }
  return <MainPage />
}


