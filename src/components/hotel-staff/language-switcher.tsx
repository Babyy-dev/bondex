"use client"

import { useI18n } from "./i18n"

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  const toggle = () => setLocale(locale === "en" ? "ja" : "en")

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
      title={locale === "en" ? "Switch to Japanese" : "英語に切り替え"}
    >
      <span className="text-base leading-none">{locale === "en" ? "🇯🇵" : "🇺🇸"}</span>
      <span>{locale === "en" ? "日本語" : "English"}</span>
    </button>
  )
}
