import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

const KEY = 'deshix_age_ok'

type Ctx = {
  ok: boolean
  enter: () => void
}

const AgeContext = createContext<Ctx | null>(null)

export function AgeProvider({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(() => localStorage.getItem(KEY) === '1')
  const enter = () => {
    localStorage.setItem(KEY, '1')
    setOk(true)
  }
  const value = useMemo(() => ({ ok, enter }), [ok])
  return <AgeContext.Provider value={value}>{children}</AgeContext.Provider>
}

export function useAge() {
  const ctx = useContext(AgeContext)
  if (!ctx) throw new Error('useAge')
  return ctx
}
