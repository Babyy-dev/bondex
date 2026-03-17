"use client"

import { Suspense } from "react"
import { TravelerFlow } from "@/components/traveler/traveler-flow"
import { useRouter } from "next/navigation"

function BookContent() {
  const router = useRouter()
  return (
    <TravelerFlow
      onBack={() => router.push("/")}
      initialStep="destination"
    />
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <BookContent />
    </Suspense>
  )
}
