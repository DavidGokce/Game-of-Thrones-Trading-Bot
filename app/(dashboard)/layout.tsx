import type React from "react"
import { Header } from "@/components/header"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/sidebar"

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
    <div className="min-h-screen flex flex-col bg-background">
      <Header user={user} />
      <div className="flex-1 flex">
        <Sidebar className="hidden lg:block w-64 border-r" />
        <main className="flex-1 flex flex-col">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
