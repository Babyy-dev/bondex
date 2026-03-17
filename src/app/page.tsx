"use client"

import { Suspense } from "react"
import Link from "next/link"
import { Briefcase, Building2, Shield } from "lucide-react"

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>}>
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm mb-4">
              Wireframes
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
              BondEx
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto text-balance">
              Luggage delivery platform for international travelers in Japan
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/book"
              className="group p-6 rounded-lg border-2 border-border bg-card hover:border-foreground transition-all text-left"
            >
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4 group-hover:bg-foreground group-hover:text-background transition-colors">
                <Briefcase className="w-6 h-6" />
              </div>
              <h2 className="font-semibold text-lg text-foreground mb-2">Traveler</h2>
              <p className="text-sm text-muted-foreground">
                Mobile-first web app for booking luggage delivery
              </p>
              <div className="mt-4 text-xs text-muted-foreground">
                7 screens
              </div>
            </Link>

            <Link
              href="/hotel/login"
              className="group p-6 rounded-lg border-2 border-border bg-card hover:border-foreground transition-all text-left"
            >
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4 group-hover:bg-foreground group-hover:text-background transition-colors">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="font-semibold text-lg text-foreground mb-2">Hotel Staff</h2>
              <p className="text-sm text-muted-foreground">
                Tablet/mobile web app for check-in processing
              </p>
              <div className="mt-4 text-xs text-muted-foreground">
                5 screens
              </div>
            </Link>

            <Link
              href="/admin/login"
              className="group p-6 rounded-lg border-2 border-border bg-card hover:border-foreground transition-all text-left"
            >
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4 group-hover:bg-foreground group-hover:text-background transition-colors">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="font-semibold text-lg text-foreground mb-2">Admin / CS</h2>
              <p className="text-sm text-muted-foreground">
                Desktop dashboard for operations and support
              </p>
              <div className="mt-4 text-xs text-muted-foreground">
                4 screens
              </div>
            </Link>
          </div>

          <div className="mt-12 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground text-center">
              <span className="font-medium text-foreground">Design Philosophy:</span> Decision OS that eliminates human judgment, stays silent during normal operations, surfaces only the next single action during exceptions.
            </p>
          </div>
        </div>
      </main>
    </Suspense>
  )
}
