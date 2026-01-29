import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, department_id")
      .eq("id", user.id)
      .single()

    // Build query based on role
    let query = supabase
      .from("leave_requests")
      .select(`
        *,
        user_profiles (
          id,
          first_name,
          last_name,
          employee_id,
          department_id,
          leave_status,
          departments (name, code)
        )
      `)
      .order("created_at", { ascending: false })

    // Role-based filtering
    if (profile?.role === "admin" || profile?.role === "hr") {
      // Admin and HR see all requests
    } else if (profile?.role === "department_head" || profile?.role === "regional_manager") {
      // Department heads see their department's requests
      query = query.eq("user_profiles.department_id", profile.department_id)
    } else {
      // Regular staff see only their own requests
      query = query.eq("user_id", user.id)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error("Error fetching leave requests:", error)
      return NextResponse.json({ error: "Failed to fetch leave requests" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: requests })
  } catch (error) {
    console.error("Leave GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { leave_type, start_date, end_date, reason, attachment_url } = body

    if (!leave_type || !start_date || !end_date || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Calculate leave days
    const startDate = new Date(start_date)
    const endDate = new Date(end_date)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const leave_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    // Insert leave request
    const { data: leaveRequest, error: insertError } = await supabase
      .from("leave_requests")
      .insert({
        user_id: user.id,
        leave_type,
        start_date,
        end_date,
        reason,
        attachment_url: attachment_url || null,
        leave_days,
        status: "pending",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting leave request:", insertError)
      return NextResponse.json({ error: "Failed to submit leave request" }, { status: 500 })
    }

    // Update user's leave_status to "pending_leave"
    await supabase
      .from("user_profiles")
      .update({ leave_status: "pending_leave" })
      .eq("id", user.id)

    return NextResponse.json({ 
      success: true, 
      message: "Leave request submitted successfully. Your status will be updated once approved.",
      data: leaveRequest 
    })
  } catch (error) {
    console.error("Leave POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to approve/reject
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const allowedRoles = ["admin", "hr", "department_head", "regional_manager"]
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized to approve/reject leave requests" }, { status: 403 })
    }

    const body = await request.json()
    const { request_id, status, review_notes } = body

    if (!request_id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Get the leave request to find the user
    const { data: leaveRequest, error: fetchError } = await supabase
      .from("leave_requests")
      .select("user_id, start_date, end_date")
      .eq("id", request_id)
      .single()

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    // Update leave request status
    const { error: updateError } = await supabase
      .from("leave_requests")
      .update({
        status,
        reviewed_by: user.id,
        review_notes: review_notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request_id)

    if (updateError) {
      console.error("Error updating leave request:", updateError)
      return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 })
    }

    // Update user's leave_status based on the decision
    if (status === "approved") {
      // Check if leave period has started
      const today = new Date()
      const startDate = new Date(leaveRequest.start_date)
      
      if (startDate <= today) {
        // Leave has started, set status to on_leave
        await supabase
          .from("user_profiles")
          .update({ leave_status: "on_leave" })
          .eq("id", leaveRequest.user_id)
      } else {
        // Leave hasn't started yet, set to approved_leave
        await supabase
          .from("user_profiles")
          .update({ leave_status: "approved_leave" })
          .eq("id", leaveRequest.user_id)
      }
    } else if (status === "rejected") {
      // Rejected - set back to at_post
      await supabase
        .from("user_profiles")
        .update({ leave_status: "at_post" })
        .eq("id", leaveRequest.user_id)
    }

    const statusMessage = status === "approved" 
      ? "Leave request approved. Staff status updated to on leave."
      : "Leave request rejected. Staff status set to at post. Staff should contact their department head for clarification."

    return NextResponse.json({ 
      success: true, 
      message: statusMessage
    })
  } catch (error) {
    console.error("Leave PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
