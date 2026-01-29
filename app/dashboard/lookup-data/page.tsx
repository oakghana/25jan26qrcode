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
    <LookupDataClient
      initialDepartments={departmentsRes.data || []}
      initialLocations={locationsRes.data || []}
    />
  )
}
