"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { StatsCard } from "@/components/dashboard/stats-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, Calendar, Users, TrendingUp, UserCheck, AlertCircle, Activity, Home, LogIn, LogOut, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { redirect } from "next/navigation"

// Helper function to format time consistently (avoids hydration mismatch)
function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const ampm = hours >= 12 ? "PM" : "AM"
  const hour12 = hours % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.toLocaleString("en-US", { month: "short" })
  const day = date.getDate()
  const year = date.getFullYear()
  return `${month} ${day}, ${year} at ${formatTime(dateStr)}`
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [todayAttendance, setTodayAttendance] = useState<any>(null)
  const [monthlyAttendance, setMonthlyAttendance] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          redirect("/auth/login")
          return
        }
        setUser(user)

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

        const profileData = profileResult.data
        const todayAttendanceData = todayAttendanceResult.data
        const monthlyCount = monthlyCountResult.count || 0

        setProfile(profileData)
        setTodayAttendance(todayAttendanceData)
        setMonthlyAttendance(monthlyCount)

        // Only fetch pending approvals for admins
        if (profileData?.role === "admin") {
          const { count } = await supabase
            .from("user_profiles")
            .select("*", { count: "exact", head: true })
            .eq("is_active", false)
          setPendingApprovals(count || 0)
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) {
    return null
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
            <Card className="bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300 shadow-lg dark:from-orange-900/40 dark:to-orange-800/40 dark:border-orange-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-300 dark:bg-orange-800 rounded-xl">
                    <LogIn className="h-6 w-6 text-orange-700 dark:text-orange-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-orange-900 dark:text-white">Not Checked In</h3>
                    <p className="text-orange-700 dark:text-orange-200 text-sm">You have not checked in today. Please check in to record your attendance.</p>
                  </div>
                </div>
                <Button asChild className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white">
                  <Link href="/dashboard/attendance">
                    <LogIn className="h-4 w-4 mr-2" />
                    Check In Now
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {isCheckedIn && (
            <Card className="bg-gradient-to-br from-green-100 to-emerald-200 border-emerald-300 shadow-lg dark:from-emerald-900/40 dark:to-emerald-800/40 dark:border-emerald-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-300 dark:bg-emerald-800 rounded-xl">
                    <LogIn className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-emerald-900 dark:text-white">Checked In ✓</h3>
                    <p className="text-emerald-700 dark:text-emerald-200 text-sm">
                      Checked in at {formatTime(todayAttendance.check_in_time)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Check-out Status Card */}
          {isCheckedIn && (
            <Card className="bg-gradient-to-br from-pink-100 to-rose-200 border-pink-300 shadow-lg dark:from-pink-900/40 dark:to-rose-800/40 dark:border-pink-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-pink-300 dark:bg-pink-800 rounded-xl">
                    <AlertTriangle className="h-6 w-6 text-pink-700 dark:text-pink-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-pink-900 dark:text-white">Pending Check-out</h3>
                    <p className="text-pink-700 dark:text-rose-200 text-sm">Remember to check out before leaving work today.</p>
                  </div>
                </div>
                <Button asChild className="w-full mt-4 bg-pink-500 hover:bg-pink-600 text-white">
                  <Link href="/dashboard/attendance">
                    <LogOut className="h-4 w-4 mr-2" />
                    Go to Attendance
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {isCheckedOut && (
            <Card className="bg-gradient-to-br from-green-100 to-teal-200 border-teal-300 shadow-lg sm:col-span-2 dark:from-teal-900/40 dark:to-emerald-800/40 dark:border-teal-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-teal-300 dark:bg-teal-800 rounded-xl">
                    <LogOut className="h-6 w-6 text-teal-700 dark:text-teal-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-teal-900 dark:text-white">Attendance Complete ✓</h3>
                    <p className="text-teal-700 dark:text-teal-200 text-sm">
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
                  ? `At ${formatTime(todayAttendance.check_in_time)}`
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
                          {formatDateTime(todayAttendance.check_in_time)}
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
              <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-orange-100 to-amber-200 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-orange-300 dark:border-gray-600">
                <div className="text-2xl sm:text-3xl font-heading font-bold text-orange-900 dark:text-white mb-2">{monthlyAttendance}</div>
                <div className="text-sm font-medium text-orange-700 dark:text-gray-300">Days This Month</div>
              </div>
              <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-green-100 to-emerald-200 dark:from-emerald-800 dark:to-emerald-700 rounded-xl border border-emerald-300 dark:border-emerald-600">
                <div className="text-2xl sm:text-3xl font-heading font-bold text-emerald-900 dark:text-white mb-2">
                  {monthlyAttendance ? Math.round((monthlyAttendance / new Date().getDate()) * 100) : 0}%
                </div>
                <div className="text-sm font-medium text-emerald-700 dark:text-gray-300">Attendance Rate</div>
              </div>
              <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-pink-100 to-rose-200 dark:from-blue-800 dark:to-blue-700 rounded-xl border border-pink-300 dark:border-blue-600">
                <div className="text-base sm:text-lg font-heading font-bold text-pink-900 dark:text-white mb-2">
                  {profile?.role === "admin"
                    ? "Administrator"
                    : profile?.role === "department_head"
                      ? "Department Head"
                      : "Staff"}
                </div>
                <div className="text-sm font-medium text-pink-700 dark:text-gray-300">Role</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
