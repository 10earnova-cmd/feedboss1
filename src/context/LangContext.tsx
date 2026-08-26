import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Lang } from '../types'

const KEY = 'deshix_lang'

type Ctx = {
  lang: Lang
  setLang: (l: Lang) => void
}

const LangContext = createContext<Ctx | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(KEY)
    return saved === 'en' || saved === 'bn' ? saved : 'bn'
  })

  const setLang = (l: Lang) => {
    localStorage.setItem(KEY, l)
    setLangState(l)
    document.documentElement.lang = l === 'bn' ? 'bn' : 'en'
  }

  const value = useMemo(() => ({ lang, setLang }), [lang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang')
  return ctx
}
