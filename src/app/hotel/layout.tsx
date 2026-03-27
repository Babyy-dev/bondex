import { LanguageProvider } from "@/contexts/language-context"

export default function HotelLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  )
}
