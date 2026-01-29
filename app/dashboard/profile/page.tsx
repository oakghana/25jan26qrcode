import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ProfileClient } from "@/components/profile/profile-client"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

function ProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="h-64 w-full bg-muted animate-pulse rounded-lg" />
    </div>
  )
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <DashboardLayout>
      <Suspense fallback={<ProfileLoading />}>
        <ProfileClient />
      </Suspense>
    </DashboardLayout>
  )
}
