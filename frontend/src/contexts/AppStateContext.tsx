import React, { createContext, useContext, useState } from 'react'

export type AppState = {
  selectedId: string | null
  compareIds: string[]
}

const Ctx = createContext<{
  state: AppState
  setState: React.Dispatch<React.SetStateAction<AppState>>
} | null>(null)

export function AppStateProvider({ children }: { children: React.ReactNode }){
  const [state, setState] = useState<AppState>({ selectedId: null, compareIds: [] })
  return <Ctx.Provider value={{ state, setState }}>{children}</Ctx.Provider>
}

export function useAppState(){
  const ctx = useContext(Ctx)
  if(!ctx) throw new Error('AppStateProvider missing')
  return ctx
}


