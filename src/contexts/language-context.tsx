"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { Lang } from "@/lib/i18n"

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  toggle: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("bondex_lang") as Lang) ?? "en"
    }
    return "en"
  })

  const setLangPersisted = (l: Lang) => {
    setLang(l)
    if (typeof window !== "undefined") localStorage.setItem("bondex_lang", l)
  }

  const toggle = () => setLangPersisted(lang === "en" ? "ja" : "en")

  return (
    <LanguageContext.Provider value={{ lang, setLang: setLangPersisted, toggle }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}
