"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar, CalendarDays, Clock, FileText, Plus, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"

interface LeaveRequest {
  id: string
  user_id: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  reviewed_by?: string
  review_notes?: string
  user_profiles?: {
    first_name: string
    last_name: string
  }
}

interface LeaveBalance {
  annual_leave: number
  sick_leave: number
  casual_leave: number
  used_annual: number
  used_sick: number
  used_casual: number
}

export default function LeaveManagementPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNewRequest, setShowNewRequest] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [newRequest, setNewRequest] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Get user role
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      setUserRole(profile?.role || "staff")

      // Fetch leave requests
      let query = supabase
        .from("leave_requests")
        .select(`
          *,
          user_profiles (first_name, last_name)
        `)
        .order("created_at", { ascending: false })

      // Non-admins only see their own requests
      if (profile?.role !== "admin" && profile?.role !== "hr" && profile?.role !== "department_head") {
        query = query.eq("user_id", user.id)
      }

      const { data: requests, error: requestsError } = await query

      if (requestsError) {
        console.error("Error fetching leave requests:", requestsError)
      } else {
        setLeaveRequests(requests || [])
      }

      // Fetch leave balance (mock data for now)
      setLeaveBalance({
        annual_leave: 21,
        sick_leave: 10,
        casual_leave: 5,
        used_annual: 5,
        used_sick: 2,
        used_casual: 1,
      })

    } catch (err) {
      console.error("Error:", err)
      setError("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitRequest = async () => {
    if (!newRequest.leave_type || !newRequest.start_date || !newRequest.end_date || !newRequest.reason) {
      setError("Please fill in all fields")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError("Not authenticated")
        return
      }

      const { error: insertError } = await supabase
        .from("leave_requests")
        .insert({
          user_id: user.id,
          leave_type: newRequest.leave_type,
          start_date: newRequest.start_date,
          end_date: newRequest.end_date,
          reason: newRequest.reason,
          status: "pending",
        })

      if (insertError) {
        throw insertError
      }

      setSuccess("Leave request submitted successfully")
      setShowNewRequest(false)
      setNewRequest({ leave_type: "", start_date: "", end_date: "", reason: "" })
      fetchData()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error("Error submitting request:", err)
      setError("Failed to submit leave request")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatus = async (requestId: string, status: "approved" | "rejected", notes?: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error: updateError } = await supabase
        .from("leave_requests")
        .update({
          status,
          reviewed_by: user?.id,
          review_notes: notes || null,
        })
        .eq("id", requestId)

      if (updateError) throw updateError

      setSuccess(`Leave request ${status}`)
      fetchData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error("Error updating status:", err)
      setError("Failed to update leave request")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-600 text-white">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-600 text-white">Rejected</Badge>
      default:
        return <Badge className="bg-amber-600 text-white">Pending</Badge>
    }
  }

  const isAdmin = userRole === "admin" || userRole === "hr" || userRole === "department_head"

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">Leave Management</h1>
              <p className="text-muted-foreground">Manage your leave requests and balances</p>
            </div>
          </div>
          <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Leave Request</DialogTitle>
                <DialogDescription>Fill in the details for your leave request</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <Select value={newRequest.leave_type} onValueChange={(value) => setNewRequest({ ...newRequest, leave_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                      <SelectItem value="maternity">Maternity Leave</SelectItem>
                      <SelectItem value="paternity">Paternity Leave</SelectItem>
                      <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={newRequest.start_date}
                      onChange={(e) => setNewRequest({ ...newRequest, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={newRequest.end_date}
                      onChange={(e) => setNewRequest({ ...newRequest, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    placeholder="Please provide a reason for your leave request..."
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewRequest(false)}>Cancel</Button>
                <Button onClick={handleSubmitRequest} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <p className="text-emerald-400">{success}</p>
          </div>
        )}

        {/* Leave Balance Cards */}
        {leaveBalance && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-blue-900 border-blue-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-200">Annual Leave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {leaveBalance.annual_leave - leaveBalance.used_annual} / {leaveBalance.annual_leave}
                </div>
                <p className="text-xs text-blue-300 mt-1">Days remaining</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-900 border-amber-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-200">Sick Leave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {leaveBalance.sick_leave - leaveBalance.used_sick} / {leaveBalance.sick_leave}
                </div>
                <p className="text-xs text-amber-300 mt-1">Days remaining</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-900 border-emerald-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-200">Casual Leave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {leaveBalance.casual_leave - leaveBalance.used_casual} / {leaveBalance.casual_leave}
                </div>
                <p className="text-xs text-emerald-300 mt-1">Days remaining</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leave Requests Table */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isAdmin ? "All Leave Requests" : "My Leave Requests"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {isAdmin ? "Review and manage leave requests from staff" : "View and track your leave requests"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : leaveRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No leave requests found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    {isAdmin && <TableHead className="text-gray-300">Employee</TableHead>}
                    <TableHead className="text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-300">Start Date</TableHead>
                    <TableHead className="text-gray-300">End Date</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Reason</TableHead>
                    {isAdmin && <TableHead className="text-gray-300">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((request) => (
                    <TableRow key={request.id} className="border-gray-700">
                      {isAdmin && (
                        <TableCell className="text-white">
                          {request.user_profiles?.first_name} {request.user_profiles?.last_name}
                        </TableCell>
                      )}
                      <TableCell className="text-white capitalize">{request.leave_type}</TableCell>
                      <TableCell className="text-gray-300">
                        {format(new Date(request.start_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {format(new Date(request.end_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-gray-300 max-w-[200px] truncate">{request.reason}</TableCell>
                      {isAdmin && request.status === "pending" && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleUpdateStatus(request.id, "approved")}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUpdateStatus(request.id, "rejected")}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                      {isAdmin && request.status !== "pending" && <TableCell>-</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
