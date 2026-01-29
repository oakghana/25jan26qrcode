import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { LocationManagement } from "@/components/admin/location-management"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function LocationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Location Management</h1>
          <p className="text-muted-foreground">Manage QCC office locations and geofence settings</p>
        </div>
        <LocationManagement />
      </div>
    </DashboardLayout>
  )
}
