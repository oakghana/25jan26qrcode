import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { StatsCard } from "@/components/dashboard/stats-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, Calendar, Users, TrendingUp, UserCheck, AlertCircle, Activity, Home, LogIn, LogOut, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Dashboard | QCC Electronic Attendance",
  description: "Your dashboard overview with quick access to attendance features",
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Parallel fetch for better performance
  const today = new Date().toISOString().split("T")[0]
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [profileResult, todayAttendanceResult, monthlyCountResult] = await Promise.all([
    supabase
      .from("user_profiles")
      .select(`id, first_name, last_name, role, departments (name, code)`)
      .eq("id", user.id)
      .single(),
    supabase
      .from("attendance_records")
      .select("id, check_in_time, check_out_time")
      .eq("user_id", user.id)
      .gte("check_in_time", `${today}T00:00:00`)
      .lt("check_in_time", `${today}T23:59:59`)
      .maybeSingle(),
    supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("check_in_time", startOfMonth),
  ])

  const profile = profileResult.data
  const todayAttendance = todayAttendanceResult.data
  const monthlyAttendance = monthlyCountResult.count || 0

  // Only fetch pending approvals for admins
  let pendingApprovals = 0
  if (profile?.role === "admin") {
    const { count } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", false)
    pendingApprovals = count || 0
  }

  // Determine check-in/check-out status
  const isCheckedIn = todayAttendance?.check_in_time && !todayAttendance?.check_out_time
  const isCheckedOut = todayAttendance?.check_out_time
  const notCheckedIn = !todayAttendance?.check_in_time

  // Calculate hours worked if checked out
  let hoursWorked = 0
  if (todayAttendance?.check_in_time && todayAttendance?.check_out_time) {
    const checkIn = new Date(todayAttendance.check_in_time)
    const checkOut = new Date(todayAttendance.check_out_time)
    hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Home className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground tracking-tight">Dashboard</h1>
              <p className="text-base sm:text-lg text-muted-foreground font-medium">
                Welcome back,{" "}
                <span className="text-primary font-semibold">{profile?.first_name || user?.email?.split("@")[0]}</span>{" "}
                {profile?.last_name || ""}
              </p>
            </div>
          </div>
        </div>

        {profile?.role === "admin" && pendingApprovals > 0 && (
          <Alert className="border-primary/20 bg-primary/5 shadow-sm">
            <AlertCircle className="h-5 w-5 text-primary" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-primary font-semibold text-base">
                {pendingApprovals} user{pendingApprovals > 1 ? "s" : ""} awaiting approval
              </span>
              <Button asChild size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                <Link href="/dashboard/user-approvals">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Review Now
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Check-in/Check-out Warning Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
          {/* Check-in Status Card */}
          {notCheckedIn && (
            <Card className="bg-amber-900 border-amber-700 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-800 rounded-xl">
                    <LogIn className="h-6 w-6 text-amber-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">Not Checked In</h3>
                    <p className="text-amber-200 text-sm">You have not checked in today. Please check in to record your attendance.</p>
                  </div>
                </div>
                <Button asChild className="w-full mt-4 bg-amber-700 hover:bg-amber-600 text-white">
                  <Link href="/dashboard/attendance">
                    <LogIn className="h-4 w-4 mr-2" />
                    Check In Now
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {isCheckedIn && (
            <Card className="bg-emerald-900 border-emerald-700 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-800 rounded-xl">
                    <LogIn className="h-6 w-6 text-emerald-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">Checked In ✓</h3>
                    <p className="text-emerald-200 text-sm">
                      Checked in at {new Date(todayAttendance.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Check-out Status Card */}
          {isCheckedIn && (
            <Card className="bg-orange-900 border-orange-700 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-800 rounded-xl">
                    <AlertTriangle className="h-6 w-6 text-orange-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">Pending Check-out</h3>
                    <p className="text-orange-200 text-sm">Remember to check out before leaving work today.</p>
                  </div>
                </div>
                <Button asChild className="w-full mt-4 bg-orange-700 hover:bg-orange-600 text-white">
                  <Link href="/dashboard/attendance">
                    <LogOut className="h-4 w-4 mr-2" />
                    Go to Attendance
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {isCheckedOut && (
            <Card className="bg-emerald-900 border-emerald-700 shadow-lg sm:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-800 rounded-xl">
                    <LogOut className="h-6 w-6 text-emerald-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">Attendance Complete ✓</h3>
                    <p className="text-emerald-200 text-sm">
                      You worked {hoursWorked.toFixed(1)} hours today. Great job!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Today's Status"
            value={isCheckedOut ? "Completed" : isCheckedIn ? "Checked In" : "Not Checked In"}
            description={
              isCheckedOut
                ? `Worked ${hoursWorked.toFixed(1)} hours`
                : isCheckedIn
                  ? `At ${new Date(todayAttendance.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`
                  : "Click to check in"
            }
            icon={Clock}
            variant={isCheckedOut ? "success" : isCheckedIn ? "warning" : "default"}
          />

          <StatsCard
            title="This Month"
            value={monthlyAttendance}
            description="Days attended"
            icon={Calendar}
            trend={{ value: 5, isPositive: true }}
          />

          <StatsCard
            title="Department"
            value={profile?.departments?.code || "N/A"}
            description={profile?.departments?.name || "No department assigned"}
            icon={Users}
          />
        </div>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <QuickActions />
          </div>

          <div className="lg:col-span-3">
            <Card className="shadow-sm border-0 bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-heading font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-base">Your latest attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                {todayAttendance ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/10">
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">Checked in today</p>
                        <p className="text-sm text-muted-foreground font-medium truncate">
                          {new Date(todayAttendance.check_in_time).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground">No attendance recorded today</p>
                    <p className="text-sm text-muted-foreground mt-2">Use the quick actions to check in</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-heading font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Performance Overview
            </CardTitle>
            <CardDescription className="text-base">Your attendance statistics and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
              <div className="text-center p-4 sm:p-6 bg-gray-900 rounded-xl border border-gray-700">
                <div className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">{monthlyAttendance}</div>
                <div className="text-sm font-medium text-gray-300">Days This Month</div>
              </div>
              <div className="text-center p-4 sm:p-6 bg-emerald-900 rounded-xl border border-emerald-700">
                <div className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">
                  {monthlyAttendance ? Math.round((monthlyAttendance / new Date().getDate()) * 100) : 0}%
                </div>
                <div className="text-sm font-medium text-gray-300">Attendance Rate</div>
              </div>
              <div className="text-center p-4 sm:p-6 bg-blue-900 rounded-xl border border-blue-700">
                <div className="text-base sm:text-lg font-heading font-bold text-white mb-2">
                  {profile?.role === "admin"
                    ? "Administrator"
                    : profile?.role === "department_head"
                      ? "Department Head"
                      : "Staff"}
                </div>
                <div className="text-sm font-medium text-gray-300">Role</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
