import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/server"
import { 
  Clock, 
  Calendar, 
  Users, 
  UserCheck, 
  AlertCircle, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  LogIn,
  LogOut,
  CalendarDays,
  BarChart3,
  Timer,
  Shield
} from "lucide-react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { StaffWarningModal } from "@/components/notifications/staff-warning-modal"
import { GPSStatusBanner } from "@/components/attendance/gps-status-banner"
import { WeeklySummaryModal } from "@/components/attendance/weekly-summary-modal"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select(`
      *,
      departments (
        name,
        code
      )
    `)
    .eq("id", user.id)
    .maybeSingle()

  if (!profile && !profileError) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-lg border-0 bg-gradient-to-br from-orange-500/10 via-background to-green-500/10 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <UserCheck className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
                Profile Setup Required
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-muted-foreground">Your account needs to be set up by an administrator.</p>
              <div className="space-y-3 p-4 bg-muted/20 rounded-xl backdrop-blur">
                <p className="text-xs font-mono text-muted-foreground">User ID: {user.id}</p>
                <p className="text-xs font-mono text-muted-foreground">Email: {user.email?.split("@")[0]}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  let pendingApprovals = 0
  if (profile?.role === "admin") {
    const { count } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", false)
    pendingApprovals = count || 0
  }

  const today = new Date().toISOString().split("T")[0]
  const { data: todayAttendance } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("user_id", user.id)
    .gte("check_in_time", `${today}T00:00:00`)
    .lt("check_in_time", `${today}T23:59:59`)
    .maybeSingle()

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
  
  const { data: monthlyRecords, count: monthlyAttendance } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .gte("check_in_time", startOfMonth)
    .lte("check_in_time", endOfMonth)
    .order("check_in_time", { ascending: false })
    .limit(10)

  const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString()
  const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString()
  
  const { count: lastMonthAttendance } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("check_in_time", lastMonthStart)
    .lte("check_in_time", lastMonthEnd)

  const checkInsWithCheckout = monthlyRecords?.filter(r => r.check_out_time).length || 0

  const { count: warningsCount } = await supabase
    .from("staff_warnings")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth)

  const { count: lastMonthWarnings } = await supabase
    .from("staff_warnings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", lastMonthStart)
    .lte("created_at", lastMonthEnd)

  const workingDaysThisMonth = Math.min(new Date().getDate(), 22)
  const attendanceRate = workingDaysThisMonth > 0 ? Math.round(((monthlyAttendance || 0) / workingDaysThisMonth) * 100) : 0

  const attendanceTrend = lastMonthAttendance 
    ? Math.round(((monthlyAttendance || 0) - lastMonthAttendance) / lastMonthAttendance * 100)
    : 0

  const warningsTrend = lastMonthWarnings
    ? (warningsCount || 0) - lastMonthWarnings
    : 0

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const getElapsedTime = () => {
    if (!todayAttendance) return { hours: 0, minutes: 0 }
    const elapsed = Date.now() - new Date(todayAttendance.check_in_time).getTime()
    return {
      hours: Math.floor(elapsed / 3600000),
      minutes: Math.floor((elapsed % 3600000) / 60000)
    }
  }

  const elapsed = getElapsedTime()
  const checkInTime = todayAttendance ? new Date(todayAttendance.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''
  const checkOutTime = todayAttendance?.check_out_time ? new Date(todayAttendance.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <DashboardLayout>
      <WeeklySummaryModal />
      <StaffWarningModal />

      <div className="space-y-6 lg:space-y-8">
        <GPSStatusBanner />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-500 to-orange-500 bg-clip-text text-transparent">
              Welcome back, {profile?.first_name || user.email?.split("@")[0]}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg shadow-green-500/25 border-0">
              <Link href="/dashboard/attendance">
                <Clock className="h-4 w-4 mr-2" />
                Check In/Out
              </Link>
            </Button>
          </div>
        </div>

        {profile?.role === "admin" && pendingApprovals > 0 && (
          <Alert className="border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-orange-700 dark:text-orange-300 font-medium">
                {pendingApprovals} user{pendingApprovals > 1 ? "s" : ""} awaiting approval
              </span>
              <Button asChild size="sm" variant="outline" className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10">
                <Link href="/dashboard/user-approvals">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Review
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-0 bg-gradient-to-br from-green-500/5 via-background to-orange-500/5 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-orange-500/5 opacity-50" />
          <CardContent className="relative p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                  todayAttendance 
                    ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                    : "bg-gradient-to-br from-orange-500 to-amber-600"
                }`}>
                  {todayAttendance ? (
                    <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  ) : (
                    <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">
                    {todayAttendance ? "You're Checked In" : "Not Checked In Yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {todayAttendance 
                      ? `Since ${checkInTime}`
                      : "Start your day by checking in"
                    }
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                {todayAttendance && !todayAttendance.check_out_time && (
                  <div className="text-center sm:text-right px-4 py-2 bg-green-500/10 rounded-xl">
                    <p className="text-xs text-muted-foreground">Time Elapsed</p>
                    <p className="text-lg font-bold text-green-600">
                      {elapsed.hours}h {elapsed.minutes}m
                    </p>
                  </div>
                )}
                {todayAttendance?.check_out_time && (
                  <div className="text-center sm:text-right px-4 py-2 bg-orange-500/10 rounded-xl">
                    <p className="text-xs text-muted-foreground">Checked Out</p>
                    <p className="text-lg font-bold text-orange-600">
                      {checkOutTime}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/25 group-hover:scale-110 transition-transform">
                  <LogIn className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                {attendanceTrend !== 0 && (
                  <span className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                    attendanceTrend > 0 
                      ? "text-green-600 bg-green-500/10" 
                      : "text-orange-600 bg-orange-500/10"
                  }`}>
                    {attendanceTrend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {Math.abs(attendanceTrend)}%
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{monthlyAttendance || 0}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Check-ins this month</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                  <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full text-emerald-600 bg-emerald-500/10">
                  {monthlyAttendance ? Math.round((checkInsWithCheckout / monthlyAttendance) * 100) : 0}%
                </span>
              </div>
              <div className="mt-4">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{checkInsWithCheckout}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Complete check-outs</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{attendanceRate}%</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Attendance rate</p>
              </div>
              <div className="mt-3 h-2 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(attendanceRate, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className={`border-0 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group ${
            (warningsCount || 0) > 0 
              ? "bg-gradient-to-br from-red-500/10 to-red-600/5" 
              : "bg-gradient-to-br from-green-500/10 to-green-600/5"
          }`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform ${
                  (warningsCount || 0) > 0 
                    ? "bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/25" 
                    : "bg-gradient-to-br from-green-500 to-green-600 shadow-green-500/25"
                }`}>
                  {(warningsCount || 0) > 0 ? (
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  ) : (
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  )}
                </div>
                {warningsTrend !== 0 && (
                  <span className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                    warningsTrend < 0 
                      ? "text-green-600 bg-green-500/10" 
                      : "text-red-600 bg-red-500/10"
                  }`}>
                    {warningsTrend < 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
                    {Math.abs(warningsTrend)}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{warningsCount || 0}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Warnings this month</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-0 bg-gradient-to-br from-background via-green-500/5 to-orange-500/5 backdrop-blur-xl shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-orange-500 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full justify-start h-14 bg-gradient-to-r from-green-500/10 to-green-600/5 hover:from-green-500/20 hover:to-green-600/10 border border-green-500/20 text-foreground shadow-sm">
                  <Link href="/dashboard/attendance" className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-md">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Check In / Out</p>
                      <p className="text-xs text-muted-foreground">Record your attendance</p>
                    </div>
                  </Link>
                </Button>

                <Button asChild className="w-full justify-start h-14 bg-gradient-to-r from-orange-500/10 to-orange-600/5 hover:from-orange-500/20 hover:to-orange-600/10 border border-orange-500/20 text-foreground shadow-sm">
                  <Link href="/dashboard/reports" className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">View Reports</p>
                      <p className="text-xs text-muted-foreground">Check your attendance history</p>
                    </div>
                  </Link>
                </Button>

                <Button asChild className="w-full justify-start h-14 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 hover:from-emerald-500/20 hover:to-emerald-600/10 border border-emerald-500/20 text-foreground shadow-sm">
                  <Link href="/dashboard/excuse-duty" className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Excuse Duty</p>
                      <p className="text-xs text-muted-foreground">Request time off</p>
                    </div>
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-background to-muted/20 backdrop-blur-xl shadow-lg">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-orange-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-semibold text-foreground">{profile?.departments?.name || "Not assigned"}</p>
                    <p className="text-xs text-muted-foreground">{profile?.departments?.code || "N/A"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Role</p>
                    <p className="text-sm font-medium capitalize text-green-600">
                      {profile?.role?.replace("_", " ") || "Staff"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="border-0 bg-gradient-to-br from-background via-green-500/5 to-orange-500/5 backdrop-blur-xl shadow-xl h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-green-500 flex items-center justify-center">
                      <CalendarDays className="w-4 h-4 text-white" />
                    </div>
                    Recent Activity
                  </CardTitle>
                  <span className="text-xs text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
                    {currentMonth}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {monthlyRecords && monthlyRecords.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {monthlyRecords.slice(0, 7).map((record, index) => {
                      const recordCheckIn = new Date(record.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      const recordCheckOut = record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null
                      const recordDate = new Date(record.check_in_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      
                      return (
                        <div
                          key={record.id}
                          className={`flex items-center gap-4 p-3 sm:p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                            index === 0 
                              ? "bg-gradient-to-r from-green-500/10 to-orange-500/10 border border-green-500/20" 
                              : "bg-muted/20 hover:bg-muted/30"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            record.check_out_time 
                              ? "bg-gradient-to-br from-green-500 to-green-600" 
                              : "bg-gradient-to-br from-orange-500 to-orange-600"
                          }`}>
                            {record.check_out_time ? (
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            ) : (
                              <Timer className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {recordDate}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <LogIn className="w-3 h-3 text-green-500" />
                                {recordCheckIn}
                              </span>
                              {recordCheckOut && (
                                <span className="flex items-center gap-1">
                                  <LogOut className="w-3 h-3 text-orange-500" />
                                  {recordCheckOut}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {record.check_out_time ? (
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-500/10 text-green-600">
                                Complete
                              </span>
                            ) : (
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange-500/10 text-orange-600">
                                No checkout
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                      <Calendar className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">No attendance records this month</p>
                    <p className="text-sm text-muted-foreground mt-1">Start by checking in today!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
