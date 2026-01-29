"use client"

import { useState, useEffect, useRef } from "react"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CalendarDays, FileText, Plus, CheckCircle, XCircle, Loader2, AlertCircle, Upload, Paperclip, Eye, UserCircle, Info } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format, differenceInDays } from "date-fns"

interface LeaveRequest {
  id: string
  user_id: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  status: "pending" | "approved" | "rejected"
  attachment_url?: string
  leave_days?: number
  created_at: string
  reviewed_by?: string
  review_notes?: string
  reviewed_at?: string
  user_profiles?: {
    id: string
    first_name: string
    last_name: string
    employee_id: string
    leave_status: string
    departments?: {
      name: string
      code: string
    }
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
  const [isUploading, setIsUploading] = useState(false)
  const [showNewRequest, setShowNewRequest] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [rejectNotes, setRejectNotes] = useState("")
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUserStatus, setCurrentUserStatus] = useState<string>("at_post")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [newRequest, setNewRequest] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
    attachment_url: "",
  })

  const [uploadedFile, setUploadedFile] = useState<{name: string, url: string} | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Get user profile including leave_status
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role, leave_status")
        .eq("id", user.id)
        .single()

      setUserRole(profile?.role || "staff")
      setCurrentUserStatus(profile?.leave_status || "at_post")

      // Fetch leave requests via API
      const response = await fetch("/api/leave")
      const result = await response.json()

      if (result.success) {
        setLeaveRequests(result.data || [])
      } else {
        console.error("Error fetching leave requests:", result.error)
      }

      // Fetch leave balance (this would come from a leave_balances table in production)
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/leave/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadedFile({ name: file.name, url: result.url })
        setNewRequest({ ...newRequest, attachment_url: result.url })
        setSuccess("File uploaded successfully")
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.error || "Failed to upload file")
      }
    } catch (err) {
      console.error("Upload error:", err)
      setError("Failed to upload file")
    } finally {
      setIsUploading(false)
    }
  }

  const calculateLeaveDays = () => {
    if (!newRequest.start_date || !newRequest.end_date) return 0
    const start = new Date(newRequest.start_date)
    const end = new Date(newRequest.end_date)
    return differenceInDays(end, start) + 1
  }

  const handleSubmitRequest = async () => {
    if (!newRequest.leave_type || !newRequest.start_date || !newRequest.end_date || !newRequest.reason) {
      setError("Please fill in all required fields")
      return
    }

    if (!newRequest.attachment_url) {
      setError("Please upload a leave letter/evidence document")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRequest),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message)
        setShowNewRequest(false)
        setNewRequest({ leave_type: "", start_date: "", end_date: "", reason: "", attachment_url: "" })
        setUploadedFile(null)
        fetchData()
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setError(result.error || "Failed to submit leave request")
      }
    } catch (err) {
      console.error("Error submitting request:", err)
      setError("Failed to submit leave request")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    try {
      const response = await fetch("/api/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, status: "approved" }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message)
        fetchData()
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setError(result.error || "Failed to approve leave request")
      }
    } catch (err) {
      console.error("Error approving request:", err)
      setError("Failed to approve leave request")
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return

    try {
      const response = await fetch("/api/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          request_id: selectedRequest.id, 
          status: "rejected",
          review_notes: rejectNotes 
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message)
        setShowRejectDialog(false)
        setSelectedRequest(null)
        setRejectNotes("")
        fetchData()
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setError(result.error || "Failed to reject leave request")
      }
    } catch (err) {
      console.error("Error rejecting request:", err)
      setError("Failed to reject leave request")
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

  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case "on_leave":
        return <Badge className="bg-blue-600 text-white">On Leave</Badge>
      case "pending_leave":
        return <Badge className="bg-amber-600 text-white">Pending Leave</Badge>
      case "approved_leave":
        return <Badge className="bg-emerald-600 text-white">Leave Approved</Badge>
      default:
        return <Badge className="bg-gray-600 text-white">At Post</Badge>
    }
  }

  const isAdmin = userRole === "admin" || userRole === "hr" || userRole === "department_head" || userRole === "regional_manager"

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">Leave Management</h1>
              <p className="text-muted-foreground">Manage your leave requests and balances</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Your Status:</span>
              {getLeaveStatusBadge(currentUserStatus)}
            </div>
            <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Submit Leave Request</DialogTitle>
                  <DialogDescription>Fill in the details and upload your leave letter</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Leave Type <span className="text-red-500">*</span></Label>
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
                        <SelectItem value="study">Study Leave</SelectItem>
                        <SelectItem value="compassionate">Compassionate Leave</SelectItem>
                        <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date <span className="text-red-500">*</span></Label>
                      <Input
                        type="date"
                        value={newRequest.start_date}
                        onChange={(e) => setNewRequest({ ...newRequest, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date <span className="text-red-500">*</span></Label>
                      <Input
                        type="date"
                        value={newRequest.end_date}
                        min={newRequest.start_date}
                        onChange={(e) => setNewRequest({ ...newRequest, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {newRequest.start_date && newRequest.end_date && (
                    <Alert className="bg-blue-900/20 border-blue-700">
                      <Info className="h-4 w-4 text-blue-400" />
                      <AlertDescription className="text-blue-300">
                        Leave Duration: <strong>{calculateLeaveDays()} day(s)</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Reason <span className="text-red-500">*</span></Label>
                    <Textarea
                      placeholder="Please provide a detailed reason for your leave request..."
                      value={newRequest.reason}
                      onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Leave Letter/Evidence <span className="text-red-500">*</span></Label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                      {uploadedFile ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-400">
                          <Paperclip className="h-4 w-4" />
                          <span>{uploadedFile.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadedFile(null)
                              setNewRequest({ ...newRequest, attachment_url: "" })
                            }}
                          >
                            <XCircle className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Leave Letter
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-gray-400 mt-2">PDF, JPEG, PNG (max 5MB)</p>
                        </>
                      )}
                    </div>
                  </div>

                  <Alert className="bg-amber-900/20 border-amber-700">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <AlertTitle className="text-amber-300">Important Notice</AlertTitle>
                    <AlertDescription className="text-amber-200 text-sm">
                      Once submitted, your status will change to &quot;Pending Leave&quot;. Upon approval, your status will automatically change to &quot;On Leave&quot;. If rejected, you will be set back to &quot;At Post&quot; and should contact your department head for clarification.
                    </AlertDescription>
                  </Alert>
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
        </div>

        {error && (
          <Alert className="bg-red-900/20 border-red-700">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-emerald-900/20 border-emerald-700">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <AlertDescription className="text-emerald-400">{success}</AlertDescription>
          </Alert>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      {isAdmin && <TableHead className="text-gray-300">Employee</TableHead>}
                      {isAdmin && <TableHead className="text-gray-300">Staff Status</TableHead>}
                      <TableHead className="text-gray-300">Type</TableHead>
                      <TableHead className="text-gray-300">Duration</TableHead>
                      <TableHead className="text-gray-300">Days</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Attachment</TableHead>
                      {isAdmin && <TableHead className="text-gray-300">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.map((request) => (
                      <TableRow key={request.id} className="border-gray-700">
                        {isAdmin && (
                          <TableCell className="text-white">
                            <div className="flex items-center gap-2">
                              <UserCircle className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="font-medium">{request.user_profiles?.first_name} {request.user_profiles?.last_name}</p>
                                <p className="text-xs text-gray-400">{request.user_profiles?.employee_id}</p>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        {isAdmin && (
                          <TableCell>
                            {getLeaveStatusBadge(request.user_profiles?.leave_status || "at_post")}
                          </TableCell>
                        )}
                        <TableCell className="text-white capitalize">{request.leave_type}</TableCell>
                        <TableCell className="text-gray-300">
                          <div className="text-sm">
                            <p>{format(new Date(request.start_date), "MMM dd, yyyy")}</p>
                            <p className="text-gray-400">to {format(new Date(request.end_date), "MMM dd, yyyy")}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          {request.leave_days || differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {request.attachment_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(request.attachment_url, "_blank")}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {request.status === "pending" ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => handleApprove(request.id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    setShowRejectDialog(true)
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">
                                {request.status === "approved" ? "Approved" : "Rejected"}
                              </span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-400">Reject Leave Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this leave request. The staff member will be notified and their status will be set back to &quot;At Post&quot;.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">Request from:</p>
                <p className="text-white font-medium">
                  {selectedRequest?.user_profiles?.first_name} {selectedRequest?.user_profiles?.last_name}
                </p>
                <p className="text-sm text-gray-400 mt-2">Leave Type: {selectedRequest?.leave_type}</p>
              </div>
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea
                  placeholder="Please provide a reason for rejection..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <Alert className="bg-amber-900/20 border-amber-700">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-amber-200 text-sm">
                  The staff member&apos;s status will be changed to &quot;At Post&quot; and they will be advised to contact their department head for clarification.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowRejectDialog(false)
                setSelectedRequest(null)
                setRejectNotes("")
              }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Reject Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
