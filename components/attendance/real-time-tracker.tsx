"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Clock, MapPin, Activity, Users, TrendingUp, CheckCircle, AlertTriangle, Zap, Timer } from "lucide-react"

interface RealTimeData {
  currentStatus: "checked_in" | "checked_out" | "not_started"
  todayHours: number
  expectedHours: number
  currentLocation?: string
  checkInTime?: string
  estimatedCheckOut?: string
  productivity: {
    score: number
    trend: "up" | "down" | "stable"
  }
  departmentStats: {
    totalPresent: number
    totalExpected: number
    averageHours: number
  }
  recentActivity: Array<{
    id: string
    action: string
    time: string
    location: string
  }>
}

export function RealTimeTracker() {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<RealTimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date())
  }, [])

  useEffect(() => {
    fetchRealTimeData()
    const interval = setInterval(fetchRealTimeData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])
  useEffect(() => {
    if (!mounted) return
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [mounted])

  const fetchRealTimeData = async () => {
    try {
      const response = await fetch("/api/attendance/real-time")
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error("Failed to fetch real-time data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "checked_in":
        return "bg-green-500"
      case "checked_out":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "checked_in":
        return "Checked In"
      case "checked_out":
        return "Checked Out"
      default:
        return "Not Started"
    }
  }

  const calculateWorkProgress = () => {
    if (!data || data.expectedHours === 0) return 0
    return Math.min((data.todayHours / data.expectedHours) * 100, 100)
  }

  const getTimeRemaining = () => {
    if (!data?.checkInTime || !data?.estimatedCheckOut) return null
    const checkOut = new Date(data.estimatedCheckOut)
    const now = new Date()
    const diff = checkOut.getTime() - now.getTime()

    if (diff <= 0) return "Overtime"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m remaining`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </CardHeader>
          <CardContent>
            <div className="h-20 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Unable to load real-time tracking data</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Real-Time Tracker
        </h2>
        <p className="text-muted-foreground">Live updates on your attendance and work progress</p>
      </div>

      {/* Current Status */}
      <Card className="glass-effect border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              Current Status
            </span>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(data.currentStatus)} animate-pulse`}></div>
              <Badge variant="secondary">{getStatusText(data.currentStatus)}</Badge>
            </div>
          </CardTitle>
          <CardDescription>Live tracking • Last updated: {currentTime.toLocaleTimeString()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted/30 rounded-xl">
              <div className="text-2xl font-bold text-primary mb-1">{data.todayHours.toFixed(1)}h</div>
              <div className="text-sm text-muted-foreground">Hours Today</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-xl">
              <div className="text-2xl font-bold text-chart-2 mb-1">{data.expectedHours}h</div>
              <div className="text-sm text-muted-foreground">Expected</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-xl">
              <div className="text-2xl font-bold text-chart-3 mb-1">{data.productivity.score}%</div>
              <div className="text-sm text-muted-foreground">Productivity</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Work Progress</span>
              <span className="text-sm text-muted-foreground">{calculateWorkProgress().toFixed(0)}%</span>
            </div>
            <Progress value={calculateWorkProgress()} className="h-3" />
            {getTimeRemaining() && <p className="text-sm text-muted-foreground text-center">{getTimeRemaining()}</p>}
          </div>

          {data.currentLocation && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Current Location: {data.currentLocation}</span>
            </div>
          )}

          {data.checkInTime && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">
                Checked in at {new Date(data.checkInTime).toLocaleTimeString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Overview */}
      <Card className="glass-effect border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Department Overview
          </CardTitle>
          <CardDescription>Real-time attendance statistics for your department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/10">
              <div className="text-2xl font-bold text-primary mb-1">
                {data.departmentStats.totalPresent}/{data.departmentStats.totalExpected}
              </div>
              <div className="text-sm text-muted-foreground">Present Today</div>
              <div className="text-xs text-muted-foreground mt-1">
                {Math.round((data.departmentStats.totalPresent / data.departmentStats.totalExpected) * 100)}% attendance
              </div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-chart-2/5 to-chart-2/10 rounded-xl border border-chart-2/10">
              <div className="text-2xl font-bold text-chart-2 mb-1">
                {data.departmentStats.averageHours.toFixed(1)}h
              </div>
              <div className="text-sm text-muted-foreground">Avg Hours</div>
              <div className="text-xs text-muted-foreground mt-1">Department average</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-chart-3/5 to-chart-3/10 rounded-xl border border-chart-3/10">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-5 w-5 text-chart-3" />
                <span className="text-2xl font-bold text-chart-3">
                  {data.productivity.trend === "up" ? "↗" : data.productivity.trend === "down" ? "↘" : "→"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">Trend</div>
              <div className="text-xs text-muted-foreground mt-1">
                {data.productivity.trend === "up"
                  ? "Improving"
                  : data.productivity.trend === "down"
                    ? "Declining"
                    : "Stable"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="glass-effect border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest attendance actions in your department</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50"
                >
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                      <MapPin className="h-3 w-3" />
                      {activity.location}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={fetchRealTimeData} className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>
    </div>
  )
}


