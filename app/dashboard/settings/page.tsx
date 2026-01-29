import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { SettingsClient } from "@/components/settings/settings-client"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, role, first_name, last_name")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    redirect("/dashboard?error=access_denied")
  }

  // Fetch system settings
  const { data: systemSettings } = await supabase.from("system_settings").select("*").maybeSingle()

  // Extract settings from geo_settings JSON column and merge with top-level fields
  const geoSettings = systemSettings?.geo_settings || {}
  
  // Prepare initialSettings object with both profile and settings data
  const initialSettings = {
    profile,
    // Spread geo_settings which contains our new settings
    check_in_radius_mobile: geoSettings.check_in_radius_mobile ?? 100,
    check_in_radius_desktop: geoSettings.check_in_radius_desktop ?? 200,
    check_in_radius_tablet: geoSettings.check_in_radius_tablet ?? 150,
    check_out_radius_mobile: geoSettings.check_out_radius_mobile ?? 150,
    check_out_radius_desktop: geoSettings.check_out_radius_desktop ?? 300,
    check_out_radius_tablet: geoSettings.check_out_radius_tablet ?? 200,
    enable_notifications: geoSettings.enable_notifications ?? true,
    enable_email_alerts: geoSettings.enable_email_alerts ?? true,
    enable_sms_alerts: geoSettings.enable_sms_alerts ?? false,
    warning_threshold_days: geoSettings.warning_threshold_days ?? 3,
    auto_checkout_enabled: geoSettings.auto_checkout_enabled ?? false,
    auto_checkout_time: geoSettings.auto_checkout_time ?? "18:00",
    require_location_verification: geoSettings.require_location_verification ?? true,
    allow_manual_checkout: geoSettings.allow_manual_checkout ?? true,
    session_timeout_minutes: geoSettings.session_timeout_minutes ?? 30,
    max_login_attempts: geoSettings.max_login_attempts ?? 5,
    password_expiry_days: geoSettings.password_expiry_days ?? 90,
    require_2fa: geoSettings.require_2fa ?? false,
  }

  return (
    <DashboardLayout>
      <SettingsClient initialSettings={initialSettings} />
    </DashboardLayout>
  )
}
