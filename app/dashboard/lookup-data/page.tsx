import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import LookupDataClient from "@/components/admin/lookup-data-client"

export const dynamic = "force-dynamic"

export default async function LookupDataPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard")
  }

  // Fetch initial data
  const [departmentsRes, locationsRes] = await Promise.all([
    supabase.from("departments").select("*").eq("is_active", true).order("name"),
    supabase.from("geofence_locations").select("*").order("name"),
  ])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Lookup Data Management</h1>
          <p className="text-muted-foreground">Manage departments, locations, positions, and roles</p>
        </div>
        <LookupDataClient
          initialDepartments={departmentsRes.data || []}
          initialLocations={locationsRes.data || []}
        />
      </div>
    </DashboardLayout>
  )
}
