"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Clock, Plus, Edit, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Schedule {
  id: string
  title: string
  description: string
  start_time: string
  end_time: string
  date: string
  type: "work" | "meeting" | "training" | "break"
  status: "scheduled" | "completed" | "cancelled"
}

const initialScheduleState = {
  title: "",
  description: "",
  start_time: "",
  end_time: "",
  date: "",
  type: "work" as const,
}

export function ScheduleClient() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState("")
  const [newSchedule, setNewSchedule] = useState(initialScheduleState)

  const typeColors = useMemo(
    () => ({
      work: "bg-primary",
      meeting: "bg-green-500",
      training: "bg-green-500",
      break: "bg-orange-500",
    }),
    [],
  )

  const daySchedules = useMemo(
    () =>
      schedules
        .filter((schedule) => schedule.date === selectedDate)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [schedules, selectedDate],
  )

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/schedules?date=${selectedDate}`)
      const result = await response.json()

      if (result.success) {
        setSchedules(result.data)
        setError(null)
      } else {
        throw new Error(result.error || "Failed to fetch schedules")
      }
    } catch (error) {
      setError("Failed to fetch schedules")

      const mockSchedules: Schedule[] = [
        {
          id: "1",
          title: "Morning Shift",
          description: "Regular work hours",
          start_time: "08:00",
          end_time: "16:00",
          date: selectedDate,
          type: "work",
          status: "scheduled",
        },
        {
          id: "2",
          title: "Team Meeting",
          description: "Weekly department meeting",
          start_time: "10:00",
          end_time: "11:00",
          date: selectedDate,
          type: "meeting",
          status: "scheduled",
        },
      ]
      setSchedules(mockSchedules)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  const handleAddSchedule = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSchedule),
      })

      const result = await response.json()

      if (result.success) {
        const newScheduleWithId: Schedule = {
          ...newSchedule,
          id: result.data?.id || Date.now().toString(),
          status: "scheduled",
        }
        setSchedules((prev) => [...prev, newScheduleWithId])
        setSuccess("Schedule added successfully")
        setIsAddDialogOpen(false)
        setNewSchedule(initialScheduleState)

        setTimeout(() => setSuccess(null), 3000)
      } else {
        throw new Error(result.error || "Failed to add schedule")
      }
    } catch (error) {
      setError("Failed to add schedule")

      const fallbackSchedule: Schedule = {
        ...newSchedule,
        id: Date.now().toString(),
        status: "scheduled",
      }
      setSchedules((prev) => [...prev, fallbackSchedule])
      setIsAddDialogOpen(false)
      setNewSchedule(initialScheduleState)
    }
  }, [newSchedule])

  const getTypeColor = useCallback(
    (type: string) => typeColors[type as keyof typeof typeColors] || "bg-gray-500",
    [typeColors],
  )

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    setSelectedDate(today)
    setNewSchedule(prev => ({ ...prev, date: today }))
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Schedule Management</h1>
          <p className="text-muted-foreground mt-2">Manage your work schedule and appointments</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Schedule</DialogTitle>
              <DialogDescription>Create a new schedule entry for better time management</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Schedule title"
                  className="border-0 bg-gray-50 shadow-sm"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newSchedule.description}
                  onChange={(e) => setNewSchedule((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Schedule description"
                  className="border-0 bg-gray-50 shadow-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newSchedule.start_time}
                    onChange={(e) => setNewSchedule((prev) => ({ ...prev, start_time: e.target.value }))}
                    className="border-0 bg-gray-50 shadow-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newSchedule.end_time}
                    onChange={(e) => setNewSchedule((prev) => ({ ...prev, end_time: e.target.value }))}
                    className="border-0 bg-gray-50 shadow-sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newSchedule.date}
                  onChange={(e) => setNewSchedule((prev) => ({ ...prev, date: e.target.value }))}
                  className="border-0 bg-gray-50 shadow-sm"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newSchedule.type}
                  onValueChange={(value: any) => setNewSchedule((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="border-0 bg-gray-50 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="break">Break</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSchedule} className="bg-primary hover:bg-primary/90">
                Add Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Date Selector */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Calendar className="h-5 w-5" />
            Schedule for{" "}
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Label htmlFor="scheduleDate" className="font-medium">
              Select Date:
            </Label>
            <Input
              id="scheduleDate"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto border-0 bg-white shadow-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedule List */}
      <div className="grid gap-4">
        {loading ? (
          <Card className="shadow-sm border-0">
            <CardContent className="text-center py-12">
              <Clock className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading schedules...</p>
            </CardContent>
          </Card>
        ) : daySchedules.length === 0 ? (
          <Card className="shadow-sm border-0">
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 text-primary/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">No schedules for this date</h3>
              <p className="text-muted-foreground">Click "Add Schedule" to create your first entry</p>
            </CardContent>
          </Card>
        ) : (
          daySchedules.map((schedule) => (
            <Card key={schedule.id} className="shadow-sm border-0 bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full ${getTypeColor(schedule.type)} shadow-sm`}></div>
                    <div>
                      <h3 className="font-semibold text-primary">{schedule.title}</h3>
                      <p className="text-sm text-muted-foreground">{schedule.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {schedule.start_time} - {schedule.end_time}
                        </div>
                        <Badge variant="outline" className="capitalize bg-green-50 text-green-700 border-green-200">
                          {schedule.type}
                        </Badge>
                        <Badge
                          variant={schedule.status === "completed" ? "default" : "secondary"}
                          className={schedule.status === "completed" ? "bg-green-100 text-green-800" : ""}
                        >
                          {schedule.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="hover:bg-green-50 bg-transparent">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="hover:bg-red-50 bg-transparent">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}


