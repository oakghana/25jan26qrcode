"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Smartphone,
  MapPin,
  Users,
  Bell,
  Shield,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Monitor,
  Tablet,
  Clock,
} from "lucide-react"

interface SystemSettings {
  id?: string
  check_in_radius_mobile: number
  check_in_radius_desktop: number
  check_in_radius_tablet: number
  check_out_radius_mobile: number
  check_out_radius_desktop: number
  check_out_radius_tablet: number
  enable_notifications: boolean
  enable_email_alerts: boolean
  enable_sms_alerts: boolean
  warning_threshold_days: number
  auto_checkout_enabled: boolean
  auto_checkout_time: string
  require_location_verification: boolean
  allow_manual_checkout: boolean
  session_timeout_minutes: number
  max_login_attempts: number
  password_expiry_days: number
  require_2fa: boolean
}

interface SettingsClientProps {
  initialSettings: SystemSettings & { profile?: any }
}

const defaultSettings: SystemSettings = {
  check_in_radius_mobile: 100,
  check_in_radius_desktop: 200,
  check_in_radius_tablet: 150,
  check_out_radius_mobile: 150,
  check_out_radius_desktop: 300,
  check_out_radius_tablet: 200,
  enable_notifications: true,
  enable_email_alerts: true,
  enable_sms_alerts: false,
  warning_threshold_days: 3,
  auto_checkout_enabled: false,
  auto_checkout_time: "18:00",
  require_location_verification: true,
  allow_manual_checkout: true,
  session_timeout_minutes: 30,
  max_login_attempts: 5,
  password_expiry_days: 90,
  require_2fa: false,
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [settings, setSettings] = useState<SystemSettings>({ ...defaultSettings, ...initialSettings })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Dialog states
  const [deviceProximityOpen, setDeviceProximityOpen] = useState(false)
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false)
  const [securitySettingsOpen, setSecuritySettingsOpen] = useState(false)

  const saveSettings = async (settingsToSave: Partial<SystemSettings>) => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsToSave),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save settings")
      }

      setSuccess("Settings saved successfully!")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const settingsCards = [
    {
      title: "Device Proximity Settings",
      description: "Configure check-in and check-out radius for different device types",
      icon: Smartphone,
      badge: "System-wide",
      onClick: () => setDeviceProximityOpen(true),
    },
    {
      title: "Location Management",
      description: "Manage QCC locations and geofences",
      icon: MapPin,
      href: "/dashboard/locations",
    },
    {
      title: "User Management",
      description: "Manage staff accounts and permissions",
      icon: Users,
      href: "/dashboard/staff-activation",
    },
    {
      title: "Notification Settings",
      description: "Configure system notifications and alerts",
      icon: Bell,
      onClick: () => setNotificationSettingsOpen(true),
    },
    {
      title: "Security Settings",
      description: "Manage security policies and access controls",
      icon: Shield,
      onClick: () => setSecuritySettingsOpen(true),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage system configuration and preferences</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-700 dark:text-emerald-300">{success}</AlertDescription>
        </Alert>
      )}

      {/* Settings Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card
              key={index}
              className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-600"
              onClick={() => {
                if (card.onClick) {
                  card.onClick()
                } else if (card.href) {
                  window.location.href = card.href
                }
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  {card.badge && (
                    <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                      {card.badge}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg text-white mb-2">{card.title}</CardTitle>
                <CardDescription className="text-gray-400">{card.description}</CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Device Proximity Settings Dialog */}
      <Dialog open={deviceProximityOpen} onOpenChange={setDeviceProximityOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Device Proximity Settings
            </DialogTitle>
            <DialogDescription>
              Configure the GPS radius (in meters) for check-in and check-out based on device type
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Check-in Radius */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Check-in Radius</h4>
              
              <div className="grid gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32">
                    <Smartphone className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Mobile</span>
                  </div>
                  <Slider
                    value={[settings.check_in_radius_mobile]}
                    onValueChange={(value) => setSettings({ ...settings, check_in_radius_mobile: value[0] })}
                    max={500}
                    min={50}
                    step={10}
                    className="flex-1"
                  />
                  <span className="w-16 text-sm text-right">{settings.check_in_radius_mobile}m</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32">
                    <Tablet className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Tablet</span>
                  </div>
                  <Slider
                    value={[settings.check_in_radius_tablet]}
                    onValueChange={(value) => setSettings({ ...settings, check_in_radius_tablet: value[0] })}
                    max={500}
                    min={50}
                    step={10}
                    className="flex-1"
                  />
                  <span className="w-16 text-sm text-right">{settings.check_in_radius_tablet}m</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32">
                    <Monitor className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Desktop</span>
                  </div>
                  <Slider
                    value={[settings.check_in_radius_desktop]}
                    onValueChange={(value) => setSettings({ ...settings, check_in_radius_desktop: value[0] })}
                    max={500}
                    min={50}
                    step={10}
                    className="flex-1"
                  />
                  <span className="w-16 text-sm text-right">{settings.check_in_radius_desktop}m</span>
                </div>
              </div>
            </div>

            {/* Check-out Radius */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Check-out Radius</h4>
              
              <div className="grid gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32">
                    <Smartphone className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Mobile</span>
                  </div>
                  <Slider
                    value={[settings.check_out_radius_mobile]}
                    onValueChange={(value) => setSettings({ ...settings, check_out_radius_mobile: value[0] })}
                    max={500}
                    min={50}
                    step={10}
                    className="flex-1"
                  />
                  <span className="w-16 text-sm text-right">{settings.check_out_radius_mobile}m</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32">
                    <Tablet className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Tablet</span>
                  </div>
                  <Slider
                    value={[settings.check_out_radius_tablet]}
                    onValueChange={(value) => setSettings({ ...settings, check_out_radius_tablet: value[0] })}
                    max={500}
                    min={50}
                    step={10}
                    className="flex-1"
                  />
                  <span className="w-16 text-sm text-right">{settings.check_out_radius_tablet}m</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32">
                    <Monitor className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Desktop</span>
                  </div>
                  <Slider
                    value={[settings.check_out_radius_desktop]}
                    onValueChange={(value) => setSettings({ ...settings, check_out_radius_desktop: value[0] })}
                    max={500}
                    min={50}
                    step={10}
                    className="flex-1"
                  />
                  <span className="w-16 text-sm text-right">{settings.check_out_radius_desktop}m</span>
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Location Verification</Label>
                  <p className="text-sm text-muted-foreground">Staff must be within radius to check in/out</p>
                </div>
                <Switch
                  checked={settings.require_location_verification}
                  onCheckedChange={(checked) => setSettings({ ...settings, require_location_verification: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Manual Checkout</Label>
                  <p className="text-sm text-muted-foreground">Allow staff to checkout without location verification</p>
                </div>
                <Switch
                  checked={settings.allow_manual_checkout}
                  onCheckedChange={(checked) => setSettings({ ...settings, allow_manual_checkout: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviceProximityOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                saveSettings({
                  check_in_radius_mobile: settings.check_in_radius_mobile,
                  check_in_radius_desktop: settings.check_in_radius_desktop,
                  check_in_radius_tablet: settings.check_in_radius_tablet,
                  check_out_radius_mobile: settings.check_out_radius_mobile,
                  check_out_radius_desktop: settings.check_out_radius_desktop,
                  check_out_radius_tablet: settings.check_out_radius_tablet,
                  require_location_verification: settings.require_location_verification,
                  allow_manual_checkout: settings.allow_manual_checkout,
                })
                setDeviceProximityOpen(false)
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Settings Dialog */}
      <Dialog open={notificationSettingsOpen} onOpenChange={setNotificationSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notification Settings
            </DialogTitle>
            <DialogDescription>
              Configure how the system sends notifications and alerts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Enable browser push notifications</p>
              </div>
              <Switch
                checked={settings.enable_notifications}
                onCheckedChange={(checked) => setSettings({ ...settings, enable_notifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Alerts</Label>
                <p className="text-sm text-muted-foreground">Send important alerts via email</p>
              </div>
              <Switch
                checked={settings.enable_email_alerts}
                onCheckedChange={(checked) => setSettings({ ...settings, enable_email_alerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS Alerts</Label>
                <p className="text-sm text-muted-foreground">Send critical alerts via SMS</p>
              </div>
              <Switch
                checked={settings.enable_sms_alerts}
                onCheckedChange={(checked) => setSettings({ ...settings, enable_sms_alerts: checked })}
              />
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label>Warning Threshold (Days)</Label>
              <p className="text-sm text-muted-foreground">Days of missed attendance before sending warning</p>
              <Input
                type="number"
                value={settings.warning_threshold_days}
                onChange={(e) => setSettings({ ...settings, warning_threshold_days: parseInt(e.target.value) || 3 })}
                min={1}
                max={30}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Checkout</Label>
                  <p className="text-sm text-muted-foreground">Automatically checkout staff at end of day</p>
                </div>
                <Switch
                  checked={settings.auto_checkout_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, auto_checkout_enabled: checked })}
                />
              </div>
              
              {settings.auto_checkout_enabled && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={settings.auto_checkout_time}
                    onChange={(e) => setSettings({ ...settings, auto_checkout_time: e.target.value })}
                    className="w-32"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotificationSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                saveSettings({
                  enable_notifications: settings.enable_notifications,
                  enable_email_alerts: settings.enable_email_alerts,
                  enable_sms_alerts: settings.enable_sms_alerts,
                  warning_threshold_days: settings.warning_threshold_days,
                  auto_checkout_enabled: settings.auto_checkout_enabled,
                  auto_checkout_time: settings.auto_checkout_time,
                })
                setNotificationSettingsOpen(false)
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Settings Dialog */}
      <Dialog open={securitySettingsOpen} onOpenChange={setSecuritySettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security Settings
            </DialogTitle>
            <DialogDescription>
              Manage security policies and access controls
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>Session Timeout (Minutes)</Label>
              <p className="text-sm text-muted-foreground">Auto logout after inactivity</p>
              <Input
                type="number"
                value={settings.session_timeout_minutes}
                onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) || 30 })}
                min={5}
                max={480}
              />
            </div>

            <div className="space-y-3">
              <Label>Max Login Attempts</Label>
              <p className="text-sm text-muted-foreground">Lock account after failed attempts</p>
              <Input
                type="number"
                value={settings.max_login_attempts}
                onChange={(e) => setSettings({ ...settings, max_login_attempts: parseInt(e.target.value) || 5 })}
                min={3}
                max={10}
              />
            </div>

            <div className="space-y-3">
              <Label>Password Expiry (Days)</Label>
              <p className="text-sm text-muted-foreground">Force password change after days (0 = never)</p>
              <Input
                type="number"
                value={settings.password_expiry_days}
                onChange={(e) => setSettings({ ...settings, password_expiry_days: parseInt(e.target.value) || 0 })}
                min={0}
                max={365}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label>Require Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
              </div>
              <Switch
                checked={settings.require_2fa}
                onCheckedChange={(checked) => setSettings({ ...settings, require_2fa: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSecuritySettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                saveSettings({
                  session_timeout_minutes: settings.session_timeout_minutes,
                  max_login_attempts: settings.max_login_attempts,
                  password_expiry_days: settings.password_expiry_days,
                  require_2fa: settings.require_2fa,
                })
                setSecuritySettingsOpen(false)
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
