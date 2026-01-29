import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Define all available permissions in the system
export const SYSTEM_PERMISSIONS = {
  // Dashboard & General
  dashboard_view: { name: "View Dashboard", category: "Dashboard", description: "Access to main dashboard" },
  dashboard_analytics: { name: "View Analytics", category: "Dashboard", description: "Access to analytics data" },
  
  // Attendance Management
  attendance_view_own: { name: "View Own Attendance", category: "Attendance", description: "View personal attendance records" },
  attendance_view_department: { name: "View Department Attendance", category: "Attendance", description: "View attendance for department members" },
  attendance_view_all: { name: "View All Attendance", category: "Attendance", description: "View attendance for all staff" },
  attendance_check_in: { name: "Check In", category: "Attendance", description: "Ability to check in" },
  attendance_check_out: { name: "Check Out", category: "Attendance", description: "Ability to check out" },
  attendance_edit: { name: "Edit Attendance", category: "Attendance", description: "Edit attendance records" },
  attendance_export: { name: "Export Attendance", category: "Attendance", description: "Export attendance reports" },
  
  // Excuse Duty
  excuse_duty_request: { name: "Request Excuse Duty", category: "Excuse Duty", description: "Submit excuse duty requests" },
  excuse_duty_approve_department: { name: "Approve Department Excuse Duty", category: "Excuse Duty", description: "Approve excuse duty for department" },
  excuse_duty_approve_all: { name: "Approve All Excuse Duty", category: "Excuse Duty", description: "Approve any excuse duty request" },
  excuse_duty_view_all: { name: "View All Excuse Duty", category: "Excuse Duty", description: "View all excuse duty requests" },
  
  // Staff Management
  staff_view: { name: "View Staff", category: "Staff Management", description: "View staff list" },
  staff_create: { name: "Create Staff", category: "Staff Management", description: "Add new staff members" },
  staff_edit: { name: "Edit Staff", category: "Staff Management", description: "Edit staff information" },
  staff_delete: { name: "Delete Staff", category: "Staff Management", description: "Remove staff members" },
  staff_activate: { name: "Activate/Deactivate Staff", category: "Staff Management", description: "Toggle staff active status" },
  staff_reset_password: { name: "Reset Staff Password", category: "Staff Management", description: "Reset staff passwords" },
  
  // Department Management
  department_view: { name: "View Departments", category: "Departments", description: "View department list" },
  department_view_own: { name: "View Own Department", category: "Departments", description: "View own department only" },
  department_create: { name: "Create Departments", category: "Departments", description: "Add new departments" },
  department_edit: { name: "Edit Departments", category: "Departments", description: "Edit department information" },
  department_delete: { name: "Delete Departments", category: "Departments", description: "Remove departments" },
  
  // Location Management
  location_view: { name: "View Locations", category: "Locations", description: "View all locations" },
  location_view_assigned: { name: "View Assigned Locations", category: "Locations", description: "View only assigned locations" },
  location_create: { name: "Create Locations", category: "Locations", description: "Add new locations" },
  location_edit: { name: "Edit Locations", category: "Locations", description: "Edit location settings" },
  location_delete: { name: "Delete Locations", category: "Locations", description: "Remove locations" },
  
  // Reports
  reports_view_own: { name: "View Own Reports", category: "Reports", description: "View personal reports" },
  reports_view_department: { name: "View Department Reports", category: "Reports", description: "View department reports" },
  reports_view_all: { name: "View All Reports", category: "Reports", description: "Access all reports" },
  reports_generate: { name: "Generate Reports", category: "Reports", description: "Generate custom reports" },
  reports_export: { name: "Export Reports", category: "Reports", description: "Export reports to file" },
  
  // QR Code Management
  qr_view: { name: "View QR Codes", category: "QR Management", description: "View QR code events" },
  qr_generate: { name: "Generate QR Codes", category: "QR Management", description: "Generate new QR codes" },
  qr_manage: { name: "Manage QR Events", category: "QR Management", description: "Full QR event management" },
  
  // Device Management
  device_view: { name: "View Device Info", category: "Devices", description: "View device violations" },
  device_manage: { name: "Manage Devices", category: "Devices", description: "Manage device bindings" },
  
  // Audit & Logs
  audit_view: { name: "View Audit Logs", category: "Audit", description: "View system audit logs" },
  audit_export: { name: "Export Audit Logs", category: "Audit", description: "Export audit logs" },
  
  // Settings & Administration
  settings_view: { name: "View Settings", category: "Settings", description: "View system settings" },
  settings_edit: { name: "Edit Settings", category: "Settings", description: "Modify system settings" },
  lookup_data_manage: { name: "Manage Lookup Data", category: "Administration", description: "Manage roles, permissions, and lookup data" },
  user_approvals: { name: "Approve Users", category: "Administration", description: "Approve new user registrations" },
  bulk_upload: { name: "Bulk Upload", category: "Administration", description: "Upload bulk data" },
  backup_manage: { name: "Manage Backups", category: "Administration", description: "Create and restore backups" },
  
  // Warnings & Defaulters
  warnings_view: { name: "View Warnings", category: "Warnings", description: "View warning records" },
  warnings_send: { name: "Send Warnings", category: "Warnings", description: "Send warnings to staff" },
  defaulters_view: { name: "View Defaulters", category: "Warnings", description: "View attendance defaulters" },
}

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: Object.keys(SYSTEM_PERMISSIONS), // Admin has all permissions
  "it-admin": [
    "dashboard_view", "dashboard_analytics",
    "attendance_view_all", "attendance_export",
    "staff_view", "staff_edit", "staff_activate", "staff_reset_password",
    "department_view",
    "location_view", "location_create", "location_edit",
    "reports_view_all", "reports_generate", "reports_export",
    "device_view", "device_manage",
    "audit_view",
    "settings_view",
  ],
  department_head: [
    "dashboard_view", "dashboard_analytics",
    "attendance_view_own", "attendance_view_department", "attendance_check_in", "attendance_check_out", "attendance_export",
    "excuse_duty_request", "excuse_duty_approve_department", "excuse_duty_view_all",
    "staff_view",
    "department_view", "department_view_own",
    "location_view_assigned",
    "reports_view_own", "reports_view_department", "reports_generate", "reports_export",
    "qr_view", "qr_manage",
    "warnings_view", "warnings_send",
    "defaulters_view",
    "settings_view",
  ],
  staff: [
    "dashboard_view",
    "attendance_view_own", "attendance_check_in", "attendance_check_out",
    "excuse_duty_request",
    "department_view_own",
    "location_view_assigned",
    "reports_view_own",
    "settings_view",
  ],
  nsp: [
    "dashboard_view",
    "attendance_view_own", "attendance_check_in", "attendance_check_out",
    "excuse_duty_request",
    "department_view_own",
    "location_view_assigned",
    "reports_view_own",
    "settings_view",
  ],
  intern: [
    "dashboard_view",
    "attendance_view_own", "attendance_check_in", "attendance_check_out",
    "excuse_duty_request",
    "department_view_own",
    "location_view_assigned",
    "reports_view_own",
    "settings_view",
  ],
  contract: [
    "dashboard_view",
    "attendance_view_own", "attendance_check_in", "attendance_check_out",
    "excuse_duty_request",
    "department_view_own",
    "location_view_assigned",
    "reports_view_own",
    "settings_view",
  ],
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    // Get roles with their permissions
    if (type === "roles" || !type) {
      const { data: roles, error: rolesError } = await supabase
        .from("roles")
        .select("*")
        .order("name")

      if (rolesError) {
        console.error("[v0] Roles fetch error:", rolesError)
        // Return default roles if table doesn't exist
        const defaultRoles = Object.keys(DEFAULT_ROLE_PERMISSIONS).map((role, index) => ({
          id: `default-${index}`,
          name: role,
          display_name: role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
          description: `Default ${role} role`,
          permissions: DEFAULT_ROLE_PERMISSIONS[role],
          is_system: true,
          is_active: true,
          created_at: new Date().toISOString(),
        }))
        return NextResponse.json({ 
          success: true, 
          roles: defaultRoles,
          permissions: SYSTEM_PERMISSIONS,
          defaultPermissions: DEFAULT_ROLE_PERMISSIONS,
        })
      }

      return NextResponse.json({ 
        success: true, 
        roles: roles || [],
        permissions: SYSTEM_PERMISSIONS,
        defaultPermissions: DEFAULT_ROLE_PERMISSIONS,
      })
    }

    // Get departments
    if (type === "departments") {
      const { data: departments, error } = await supabase
        .from("departments")
        .select("*")
        .order("name")

      return NextResponse.json({ 
        success: true, 
        departments: departments || [] 
      })
    }

    // Get locations
    if (type === "locations") {
      const { data: locations, error } = await supabase
        .from("geofence_locations")
        .select("*")
        .order("name")

      return NextResponse.json({ 
        success: true, 
        locations: locations || [] 
      })
    }

    // Get positions/job titles
    if (type === "positions") {
      const { data: positions, error } = await supabase
        .from("positions")
        .select("*")
        .order("name")

      if (error) {
        // Return distinct positions from user_profiles if positions table doesn't exist
        const { data: profilePositions } = await supabase
          .from("user_profiles")
          .select("position")
          .not("position", "is", null)

        const uniquePositions = [...new Set(profilePositions?.map(p => p.position).filter(Boolean))]
        return NextResponse.json({ 
          success: true, 
          positions: uniquePositions.map((pos, i) => ({ id: i, name: pos }))
        })
      }

      return NextResponse.json({ success: true, positions: positions || [] })
    }

    // Get employment types
    if (type === "employment_types") {
      const employmentTypes = [
        { id: "permanent", name: "Permanent", description: "Full-time permanent staff" },
        { id: "contract", name: "Contract", description: "Contract-based employment" },
        { id: "nsp", name: "NSP", description: "National Service Personnel" },
        { id: "intern", name: "Intern", description: "Internship position" },
        { id: "temporary", name: "Temporary", description: "Temporary staff" },
      ]
      return NextResponse.json({ success: true, employment_types: employmentTypes })
    }

    // Get all lookup data
    return NextResponse.json({
      success: true,
      permissions: SYSTEM_PERMISSIONS,
      defaultPermissions: DEFAULT_ROLE_PERMISSIONS,
    })
  } catch (error) {
    console.error("[v0] Lookup data API error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch lookup data" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    const { type, data } = body

    // Create/Update Role
    if (type === "role") {
      const roleData = {
        name: data.name,
        display_name: data.display_name,
        description: data.description,
        permissions: data.permissions || [],
        is_system: data.is_system || false,
        is_active: data.is_active ?? true,
        location_access: data.location_access || [],
        department_access: data.department_access || [],
      }

      let role, error
      if (data.id) {
        // Update existing role
        const result = await supabase
          .from("roles")
          .update(roleData)
          .eq("id", data.id)
          .select()
          .single()
        role = result.data
        error = result.error
      } else {
        // Insert new role
        const result = await supabase
          .from("roles")
          .insert(roleData)
          .select()
          .single()
        role = result.data
        error = result.error
      }

      if (error) {
        console.error("[v0] Role create/update error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, role })
    }

    // Create Department
    if (type === "department") {
      const { data: department, error } = await supabase
        .from("departments")
        .insert({
          name: data.name,
          code: data.code,
          description: data.description,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, department })
    }

    // Create Location
    if (type === "location") {
      const { data: location, error } = await supabase
        .from("geofence_locations")
        .insert({
          name: data.name,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          radius_meters: data.radius_meters || 100,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, location })
    }

    // Create Position
    if (type === "position") {
      const { data: position, error } = await supabase
        .from("positions")
        .insert({
          name: data.name,
          description: data.description,
          department_id: data.department_id,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, position })
    }

    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Lookup data POST error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create lookup data" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    const { type, id, data } = body

    // Update Role
    if (type === "role") {
      const { data: role, error } = await supabase
        .from("roles")
        .update({
          display_name: data.display_name,
          description: data.description,
          permissions: data.permissions,
          location_access: data.location_access,
          department_access: data.department_access,
          is_active: data.is_active,
        })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, role })
    }

    // Update Department
    if (type === "department") {
      const { data: department, error } = await supabase
        .from("departments")
        .update({
          name: data.name,
          code: data.code,
          description: data.description,
          is_active: data.is_active,
        })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, department })
    }

    // Update Location
    if (type === "location") {
      const { data: location, error } = await supabase
        .from("geofence_locations")
        .update({
          name: data.name,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          radius_meters: data.radius_meters,
          is_active: data.is_active,
        })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, location })
    }

    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Lookup data PUT error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update lookup data" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const id = searchParams.get("id")

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    if (!type || !id) {
      return NextResponse.json({ success: false, error: "Type and ID required" }, { status: 400 })
    }

    const tableMap: Record<string, string> = {
      role: "roles",
      department: "departments",
      location: "geofence_locations",
      position: "positions",
    }

    const table = tableMap[type]
    if (!table) {
      return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 })
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from(table)
      .update({ is_active: false })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Lookup data DELETE error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete lookup data" },
      { status: 500 }
    )
  }
}
