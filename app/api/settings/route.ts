import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 })
    }

    const { data: userSettings } = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle()
    let systemSettings = null

    // Get system settings if admin
    if (profile?.role === "admin") {
      const { data: sysSettings } = await supabase.from("system_settings").select("*").maybeSingle()
      systemSettings = sysSettings
    }

    return NextResponse.json(
      {
        userSettings,
        systemSettings,
        isAdmin: profile?.role === "admin",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate, private",
          Pragma: "no-cache",
          Expires: "0",
          "X-Content-Type-Options": "nosniff",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Settings GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Get user profile to check role
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 })
    }

    // Handle direct settings update (new format from settings-client)
    const directSettings: Record<string, any> = {}
    
    // Proximity settings
    if (body.check_in_radius_mobile !== undefined) directSettings.check_in_radius_mobile = body.check_in_radius_mobile
    if (body.check_in_radius_desktop !== undefined) directSettings.check_in_radius_desktop = body.check_in_radius_desktop
    if (body.check_in_radius_tablet !== undefined) directSettings.check_in_radius_tablet = body.check_in_radius_tablet
    if (body.check_out_radius_mobile !== undefined) directSettings.check_out_radius_mobile = body.check_out_radius_mobile
    if (body.check_out_radius_desktop !== undefined) directSettings.check_out_radius_desktop = body.check_out_radius_desktop
    if (body.check_out_radius_tablet !== undefined) directSettings.check_out_radius_tablet = body.check_out_radius_tablet
    
    // Notification settings
    if (body.enable_notifications !== undefined) directSettings.enable_notifications = body.enable_notifications
    if (body.enable_email_alerts !== undefined) directSettings.enable_email_alerts = body.enable_email_alerts
    if (body.enable_sms_alerts !== undefined) directSettings.enable_sms_alerts = body.enable_sms_alerts
    if (body.warning_threshold_days !== undefined) directSettings.warning_threshold_days = body.warning_threshold_days
    if (body.auto_checkout_enabled !== undefined) directSettings.auto_checkout_enabled = body.auto_checkout_enabled
    if (body.auto_checkout_time !== undefined) directSettings.auto_checkout_time = body.auto_checkout_time
    if (body.require_location_verification !== undefined) directSettings.require_location_verification = body.require_location_verification
    if (body.allow_manual_checkout !== undefined) directSettings.allow_manual_checkout = body.allow_manual_checkout
    
    // Security settings
    if (body.session_timeout_minutes !== undefined) directSettings.session_timeout_minutes = body.session_timeout_minutes
    if (body.max_login_attempts !== undefined) directSettings.max_login_attempts = body.max_login_attempts
    if (body.password_expiry_days !== undefined) directSettings.password_expiry_days = body.password_expiry_days
    if (body.require_2fa !== undefined) directSettings.require_2fa = body.require_2fa

    // If we have direct settings, store them in geo_settings JSON column
    if (Object.keys(directSettings).length > 0) {
      // Get existing system settings
      const { data: existing } = await supabase
        .from("system_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle()

      const existingGeoSettings = existing?.geo_settings || {}
      const newGeoSettings = {
        ...existingGeoSettings,
        ...directSettings,
      }

      const { error: updateError } = await supabase
        .from("system_settings")
        .upsert({
          id: 1,
          geo_settings: newGeoSettings,
          settings: existing?.settings || {},
          updated_at: new Date().toISOString(),
        })

      if (updateError) {
        console.error("[v0] System settings update error:", updateError)
        throw updateError
      }

      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "update_system_settings",
        details: {
          updated_fields: Object.keys(directSettings),
          message: "System settings updated via settings page",
        },
        ip_address: request.headers.get("x-forwarded-for") || null,
        user_agent: request.headers.get("user-agent") || "unknown",
      })
    }

    // Handle legacy format (userSettings, systemSettings)
    const { userSettings, systemSettings } = body

    if (userSettings) {
      const { error: userSettingsError } = await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          app_settings: userSettings.app_settings || {},
          notification_settings: userSettings.notification_settings || {},
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )

      if (userSettingsError) {
        console.error("[v0] User settings update error:", userSettingsError)
        throw userSettingsError
      }

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "update_user_settings",
        details: { updated_fields: Object.keys(userSettings) },
        ip_address: request.headers.get("x-forwarded-for") || null,
        user_agent: request.headers.get("user-agent") || "unknown",
      })
    }

    if (systemSettings && profile?.role === "admin") {
      if (systemSettings.geo_settings?.browserTolerances) {
        const tolerances = systemSettings.geo_settings.browserTolerances
        const validatedTolerances: any = {}

        for (const [browser, distance] of Object.entries(tolerances)) {
          validatedTolerances[browser] = Math.max(50, Math.min(5000, Number(distance)))
        }

        systemSettings.geo_settings.browserTolerances = validatedTolerances
      }

      if (systemSettings.geo_settings?.checkInProximityRange) {
        const validatedProximity = Math.max(
          50,
          Math.min(2000, Number.parseInt(systemSettings.geo_settings.checkInProximityRange)),
        )
        systemSettings.geo_settings.checkInProximityRange = validatedProximity.toString()
        systemSettings.geo_settings.globalProximityDistance = validatedProximity.toString()
      }

      if (systemSettings.geo_settings?.defaultRadius) {
        const validatedRadius = Math.max(20, Number.parseInt(systemSettings.geo_settings.defaultRadius))
        systemSettings.geo_settings.defaultRadius = validatedRadius.toString()
      }

      const { error: systemSettingsError } = await supabase.from("system_settings").upsert({
        id: 1,
        settings: systemSettings.settings || {},
        geo_settings: systemSettings.geo_settings || {},
        updated_at: new Date().toISOString(),
      })

      if (systemSettingsError) {
        console.error("[v0] System settings update error:", systemSettingsError)
        throw systemSettingsError
      }

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "update_system_settings",
        details: {
          updated_fields: Object.keys(systemSettings),
          browser_tolerances: systemSettings.geo_settings?.browserTolerances,
          browser_specific_enabled: systemSettings.geo_settings?.enableBrowserSpecificTolerance,
          message: "System settings updated including browser-specific GPS tolerances",
        },
        ip_address: request.headers.get("x-forwarded-for") || null,
        user_agent: request.headers.get("user-agent") || "unknown",
      })
    }

    return NextResponse.json(
      { success: true, message: "Settings updated successfully" },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate, private",
          Pragma: "no-cache",
          Expires: "0",
          "X-Content-Type-Options": "nosniff",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Settings PUT error:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  }
}
