import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import StaffActivation from "@/components/admin/staff-activation"

export default async function StaffActivationPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("user_profiles").select("role, is_active").eq("id", user.id).single()
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Staff Activation</h1>
          <p className="text-muted-foreground">Review and manage staff registration requests</p>
        </div>
        <StaffActivation />
      </div>
    </DashboardLayout>
  )
}
