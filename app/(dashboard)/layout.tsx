import type React from "react"
import { Header } from "@/components/header"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // If user is not authenticated, redirect to sign in
  const user = await getCurrentUser()

  if (!user) {
    redirect("/signin")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <div className="flex-1">{children}</div>
    </div>
  )
}
