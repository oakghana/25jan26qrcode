"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { toast } from "sonner"
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  Users,
  MapPin,
  Building,
  Briefcase,
  Settings,
  Check,
  X,
  Search,
  ChevronRight,
  Eye,
  Loader2,
  Database,
  Lock,
  Unlock,
  Info,
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { createClient } from "@/lib/supabase/client"

interface Permission {
  name: string
  category: string
  description: string
}

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  permissions: string[]
  location_access: string[]
  department_access: string[]
  is_system: boolean
  is_active: boolean
}

interface Department {
  id: string
  name: string
  code: string
  description: string
  is_active: boolean
}

interface Location {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
}

interface LookupDataClientProps {
  initialDepartments: Department[]
  initialLocations: Location[]
}

export default function LookupDataClient({
  initialDepartments,
  initialLocations,
}: LookupDataClientProps) {
  const [activeTab, setActiveTab] = useState("roles")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Data states
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Record<string, Permission>>({})
  const [defaultPermissions, setDefaultPermissions] = useState<Record<string, string[]>>({})
  const [departments, setDepartments] = useState<Department[]>(initialDepartments)
  const [locations, setLocations] = useState<Location[]>(initialLocations)
  
  // Dialog states
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false)
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false)
  const [isViewRoleDialogOpen, setIsViewRoleDialogOpen] = useState(false)
  
  // Edit states
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [viewingRole, setViewingRole] = useState<Role | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  
  // Form states
  const [roleForm, setRoleForm] = useState({
    name: "",
    display_name: "",
    description: "",
    permissions: [] as string[],
    location_access: [] as string[],
    department_access: [] as string[],
  })
  
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    code: "",
    description: "",
  })
  
  const [locationForm, setLocationForm] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    radius_meters: "100",
  })

  // User state for sidebar
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const supabase = createClient()

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*, departments(*)")
          .eq("id", user.id)
          .single()
        setProfile(profile)
      }
    }
    fetchUser()
  }, [])

  // Fetch lookup data
  const fetchLookupData = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/lookup-data")
      const data = await response.json()
      
      if (data.success) {
        setRoles(data.roles || [])
        setPermissions(data.permissions || {})
        setDefaultPermissions(data.defaultPermissions || {})
      }
      
      // Fetch departments
      const deptResponse = await fetch("/api/admin/lookup-data?type=departments")
      const deptData = await deptResponse.json()
      if (deptData.success) {
        setDepartments(deptData.departments || [])
      }
      
      // Fetch locations
      const locResponse = await fetch("/api/admin/lookup-data?type=locations")
      const locData = await locResponse.json()
      if (locData.success) {
        setLocations(locData.locations || [])
      }
    } catch (error) {
      console.error("Failed to fetch lookup data:", error)
      toast.error("Failed to load lookup data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLookupData()
  }, [fetchLookupData])

  // Group permissions by category
  const permissionsByCategory = Object.entries(permissions).reduce((acc, [key, perm]) => {
    if (!acc[perm.category]) {
      acc[perm.category] = []
    }
    acc[perm.category].push({ key, ...perm })
    return acc
  }, {} as Record<string, Array<{ key: string } & Permission>>)

  // Handle role form submission
  const handleSaveRole = async () => {
    if (!roleForm.name || !roleForm.display_name) {
      toast.error("Role name and display name are required")
      return
    }
    
    setIsSaving(true)
    try {
      const method = editingRole ? "PUT" : "POST"
      const body = editingRole
        ? { type: "role", id: editingRole.id, data: roleForm }
        : { type: "role", data: { ...roleForm, is_system: false, is_active: true } }
      
      const response = await fetch("/api/admin/lookup-data", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(editingRole ? "Role updated successfully" : "Role created successfully")
        setIsRoleDialogOpen(false)
        setEditingRole(null)
        resetRoleForm()
        fetchLookupData()
      } else {
        toast.error(data.error || "Failed to save role")
      }
    } catch (error) {
      toast.error("Failed to save role")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle department form submission
  const handleSaveDepartment = async () => {
    if (!departmentForm.name || !departmentForm.code) {
      toast.error("Department name and code are required")
      return
    }
    
    setIsSaving(true)
    try {
      const method = editingDepartment ? "PUT" : "POST"
      const body = editingDepartment
        ? { type: "department", id: editingDepartment.id, data: departmentForm }
        : { type: "department", data: departmentForm }
      
      const response = await fetch("/api/admin/lookup-data", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(editingDepartment ? "Department updated successfully" : "Department created successfully")
        setIsDepartmentDialogOpen(false)
        setEditingDepartment(null)
        resetDepartmentForm()
        fetchLookupData()
      } else {
        toast.error(data.error || "Failed to save department")
      }
    } catch (error) {
      toast.error("Failed to save department")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle location form submission
  const handleSaveLocation = async () => {
    if (!locationForm.name) {
      toast.error("Location name is required")
      return
    }
    
    setIsSaving(true)
    try {
      const method = editingLocation ? "PUT" : "POST"
      const body = editingLocation
        ? { 
            type: "location", 
            id: editingLocation.id, 
            data: {
              ...locationForm,
              latitude: parseFloat(locationForm.latitude) || 0,
              longitude: parseFloat(locationForm.longitude) || 0,
              radius_meters: parseInt(locationForm.radius_meters) || 100,
            }
          }
        : { 
            type: "location", 
            data: {
              ...locationForm,
              latitude: parseFloat(locationForm.latitude) || 0,
              longitude: parseFloat(locationForm.longitude) || 0,
              radius_meters: parseInt(locationForm.radius_meters) || 100,
            }
          }
      
      const response = await fetch("/api/admin/lookup-data", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(editingLocation ? "Location updated successfully" : "Location created successfully")
        setIsLocationDialogOpen(false)
        setEditingLocation(null)
        resetLocationForm()
        fetchLookupData()
      } else {
        toast.error(data.error || "Failed to save location")
      }
    } catch (error) {
      toast.error("Failed to save location")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async (type: string, id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/lookup-data?type=${type}&id=${id}`, {
        method: "DELETE",
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(`${name} deleted successfully`)
        fetchLookupData()
      } else {
        toast.error(data.error || "Failed to delete")
      }
    } catch (error) {
      toast.error("Failed to delete")
    }
  }

  // Reset forms
  const resetRoleForm = () => {
    setRoleForm({
      name: "",
      display_name: "",
      description: "",
      permissions: [],
      location_access: [],
      department_access: [],
    })
  }

  const resetDepartmentForm = () => {
    setDepartmentForm({
      name: "",
      code: "",
      description: "",
    })
  }

  const resetLocationForm = () => {
    setLocationForm({
      name: "",
      address: "",
      latitude: "",
      longitude: "",
      radius_meters: "100",
    })
  }

  // Edit handlers
  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setRoleForm({
      name: role.name,
      display_name: role.display_name,
      description: role.description || "",
      permissions: role.permissions || [],
      location_access: role.location_access || [],
      department_access: role.department_access || [],
    })
    setIsRoleDialogOpen(true)
  }

  const handleViewRole = (role: Role) => {
    setViewingRole(role)
    setIsViewRoleDialogOpen(true)
  }

  const handleEditDepartment = (dept: Department) => {
    setEditingDepartment(dept)
    setDepartmentForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || "",
    })
    setIsDepartmentDialogOpen(true)
  }

  const handleEditLocation = (loc: Location) => {
    setEditingLocation(loc)
    setLocationForm({
      name: loc.name,
      address: loc.address || "",
      latitude: loc.latitude?.toString() || "",
      longitude: loc.longitude?.toString() || "",
      radius_meters: loc.radius_meters?.toString() || "100",
    })
    setIsLocationDialogOpen(true)
  }

  // Toggle permission
  const togglePermission = (permKey: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permKey)
        ? prev.permissions.filter(p => p !== permKey)
        : [...prev.permissions, permKey]
    }))
  }

  // Toggle all permissions in a category
  const toggleCategoryPermissions = (category: string, checked: boolean) => {
    const categoryPermKeys = permissionsByCategory[category]?.map(p => p.key) || []
    setRoleForm(prev => ({
      ...prev,
      permissions: checked
        ? [...new Set([...prev.permissions, ...categoryPermKeys])]
        : prev.permissions.filter(p => !categoryPermKeys.includes(p))
    }))
  }

  // Check if all permissions in category are selected
  const isCategoryFullySelected = (category: string) => {
    const categoryPermKeys = permissionsByCategory[category]?.map(p => p.key) || []
    return categoryPermKeys.every(key => roleForm.permissions.includes(key))
  }

  // Toggle location access
  const toggleLocationAccess = (locId: string) => {
    setRoleForm(prev => ({
      ...prev,
      location_access: prev.location_access.includes(locId)
        ? prev.location_access.filter(l => l !== locId)
        : [...prev.location_access, locId]
    }))
  }

  // Toggle department access
  const toggleDepartmentAccess = (deptId: string) => {
    setRoleForm(prev => ({
      ...prev,
      department_access: prev.department_access.includes(deptId)
        ? prev.department_access.filter(d => d !== deptId)
        : [...prev.department_access, deptId]
    }))
  }

  // Apply default permissions
  const applyDefaultPermissions = (roleName: string) => {
    const defaults = defaultPermissions[roleName] || []
    setRoleForm(prev => ({
      ...prev,
      permissions: defaults
    }))
    toast.success(`Applied default permissions for ${roleForm.name}`)
  }

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} profile={profile} />
      
      <main className="flex-1 lg:ml-64 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Database className="h-8 w-8 text-primary" />
                Lookup Data Management
              </h1>
              <p className="text-muted-foreground">
                Manage roles, permissions, departments, locations, and other system configuration
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Roles</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roles.length}</div>
                <p className="text-xs text-muted-foreground">System & Custom</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Permissions</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(permissions).length}</div>
                <p className="text-xs text-muted-foreground">Available Actions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Departments</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{departments.filter(d => d.is_active).length}</div>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Locations</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{locations.filter(l => l.is_active).length}</div>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Roles</span>
              </TabsTrigger>
              <TabsTrigger value="departments" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">Departments</span>
              </TabsTrigger>
              <TabsTrigger value="locations" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Locations</span>
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Permissions</span>
              </TabsTrigger>
            </TabsList>

            {/* Roles Tab */}
            <TabsContent value="roles" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>User Roles</CardTitle>
                    <CardDescription>
                      Define roles and their permissions. Each role determines what actions users can perform.
                    </CardDescription>
                  </div>
                  <Dialog open={isRoleDialogOpen} onOpenChange={(open) => {
                    setIsRoleDialogOpen(open)
                    if (!open) {
                      setEditingRole(null)
                      resetRoleForm()
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Role
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                      <DialogHeader>
                        <DialogTitle>{editingRole ? "Edit Role" : "Create New Role"}</DialogTitle>
                        <DialogDescription>
                          {editingRole 
                            ? "Modify role settings and permissions" 
                            : "Define a new role with specific permissions and access levels"}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-6 py-4">
                          {/* Basic Info */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="role-name">Role Name (System ID)</Label>
                              <Input
                                id="role-name"
                                value={roleForm.name}
                                onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                                placeholder="e.g., department_head"
                                disabled={editingRole?.is_system}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="role-display">Display Name</Label>
                              <Input
                                id="role-display"
                                value={roleForm.display_name}
                                onChange={(e) => setRoleForm(prev => ({ ...prev, display_name: e.target.value }))}
                                placeholder="e.g., Department Head"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="role-desc">Description</Label>
                            <Textarea
                              id="role-desc"
                              value={roleForm.description}
                              onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Describe what this role is for..."
                              rows={2}
                            />
                          </div>

                          {/* Apply Defaults */}
                          {!editingRole && Object.keys(defaultPermissions).length > 0 && (
                            <div className="space-y-2">
                              <Label>Apply Default Permissions From</Label>
                              <div className="flex flex-wrap gap-2">
                                {Object.keys(defaultPermissions).map((roleName) => (
                                  <Button
                                    key={roleName}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyDefaultPermissions(roleName)}
                                  >
                                    {roleName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          <Separator />

                          {/* Permissions */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-lg font-semibold">Permissions</Label>
                              <Badge variant="secondary">
                                {roleForm.permissions.length} / {Object.keys(permissions).length} selected
                              </Badge>
                            </div>
                            
                            <Accordion type="multiple" className="w-full">
                              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                                <AccordionItem key={category} value={category}>
                                  <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                      <Checkbox
                                        checked={isCategoryFullySelected(category)}
                                        onCheckedChange={(checked) => toggleCategoryPermissions(category, checked as boolean)}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <span className="font-medium">{category}</span>
                                      <Badge variant="outline" className="ml-2">
                                        {perms.filter(p => roleForm.permissions.includes(p.key)).length}/{perms.length}
                                      </Badge>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8 pt-2">
                                      {perms.map((perm) => (
                                        <div
                                          key={perm.key}
                                          className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                          <Checkbox
                                            id={perm.key}
                                            checked={roleForm.permissions.includes(perm.key)}
                                            onCheckedChange={() => togglePermission(perm.key)}
                                          />
                                          <div className="space-y-1">
                                            <label
                                              htmlFor={perm.key}
                                              className="text-sm font-medium cursor-pointer"
                                            >
                                              {perm.name}
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                              {perm.description}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </div>

                          <Separator />

                          {/* Location Access */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-lg font-semibold">Location Access</Label>
                              <Badge variant="secondary">
                                {roleForm.location_access.length === 0 ? "All Locations" : `${roleForm.location_access.length} selected`}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Select which locations this role can access. Leave empty for access to all locations.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {locations.filter(l => l.is_active).map((loc) => (
                                <div
                                  key={loc.id}
                                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                  <Checkbox
                                    id={`loc-${loc.id}`}
                                    checked={roleForm.location_access.includes(loc.id)}
                                    onCheckedChange={() => toggleLocationAccess(loc.id)}
                                  />
                                  <label
                                    htmlFor={`loc-${loc.id}`}
                                    className="text-sm cursor-pointer flex items-center gap-2"
                                  >
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    {loc.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          {/* Department Access */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-lg font-semibold">Department Access</Label>
                              <Badge variant="secondary">
                                {roleForm.department_access.length === 0 ? "All Departments" : `${roleForm.location_access.length} selected`}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Select which departments this role can view/manage. Leave empty for access to all departments.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {departments.filter(d => d.is_active).map((dept) => (
                                <div
                                  key={dept.id}
                                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                  <Checkbox
                                    id={`dept-${dept.id}`}
                                    checked={roleForm.department_access.includes(dept.id)}
                                    onCheckedChange={() => toggleDepartmentAccess(dept.id)}
                                  />
                                  <label
                                    htmlFor={`dept-${dept.id}`}
                                    className="text-sm cursor-pointer flex items-center gap-2"
                                  >
                                    <Building className="h-3 w-3 text-muted-foreground" />
                                    {dept.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                      
                      <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveRole} disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              {editingRole ? "Update Role" : "Create Role"}
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-center">Permissions</TableHead>
                          <TableHead className="text-center">Type</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roles.map((role) => (
                          <TableRow key={role.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{role.display_name}</div>
                                <div className="text-xs text-muted-foreground">{role.name}</div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {role.description || "No description"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">
                                {role.permissions?.length || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {role.is_system ? (
                                <Badge variant="outline" className="bg-blue-50">
                                  <Lock className="h-3 w-3 mr-1" />
                                  System
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <Unlock className="h-3 w-3 mr-1" />
                                  Custom
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {role.is_active ? (
                                <Badge className="bg-green-100 text-green-800">Active</Badge>
                              ) : (
                                <Badge variant="destructive">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewRole(role)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditRole(role)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {!role.is_system && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDelete("role", role.id, role.display_name)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Departments Tab */}
            <TabsContent value="departments" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Departments</CardTitle>
                    <CardDescription>
                      Manage organizational departments. Departments are used for staff organization and reporting.
                    </CardDescription>
                  </div>
                  <Dialog open={isDepartmentDialogOpen} onOpenChange={(open) => {
                    setIsDepartmentDialogOpen(open)
                    if (!open) {
                      setEditingDepartment(null)
                      resetDepartmentForm()
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Department
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingDepartment ? "Edit Department" : "Create New Department"}</DialogTitle>
                        <DialogDescription>
                          {editingDepartment ? "Modify department information" : "Add a new department to the organization"}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="dept-name">Department Name *</Label>
                          <Input
                            id="dept-name"
                            value={departmentForm.name}
                            onChange={(e) => setDepartmentForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Human Resources"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dept-code">Department Code *</Label>
                          <Input
                            id="dept-code"
                            value={departmentForm.code}
                            onChange={(e) => setDepartmentForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                            placeholder="e.g., HR"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dept-desc">Description</Label>
                          <Textarea
                            id="dept-desc"
                            value={departmentForm.description}
                            onChange={(e) => setDepartmentForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the department..."
                            rows={3}
                          />
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDepartmentDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveDepartment} disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              {editingDepartment ? "Update" : "Create"}
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Department</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell className="font-medium">{dept.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{dept.code}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {dept.description || "No description"}
                          </TableCell>
                          <TableCell className="text-center">
                            {dept.is_active ? (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditDepartment(dept)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete("department", dept.id, dept.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Locations Tab */}
            <TabsContent value="locations" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Locations</CardTitle>
                    <CardDescription>
                      Manage geofence locations for attendance check-in/out. Define coordinates and radius for each location.
                    </CardDescription>
                  </div>
                  <Dialog open={isLocationDialogOpen} onOpenChange={(open) => {
                    setIsLocationDialogOpen(open)
                    if (!open) {
                      setEditingLocation(null)
                      resetLocationForm()
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Location
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingLocation ? "Edit Location" : "Create New Location"}</DialogTitle>
                        <DialogDescription>
                          {editingLocation ? "Modify location settings" : "Add a new geofence location for attendance"}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="loc-name">Location Name *</Label>
                          <Input
                            id="loc-name"
                            value={locationForm.name}
                            onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Main Office"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="loc-address">Address</Label>
                          <Input
                            id="loc-address"
                            value={locationForm.address}
                            onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="e.g., 123 Main St, City"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="loc-lat">Latitude</Label>
                            <Input
                              id="loc-lat"
                              type="number"
                              step="any"
                              value={locationForm.latitude}
                              onChange={(e) => setLocationForm(prev => ({ ...prev, latitude: e.target.value }))}
                              placeholder="e.g., 5.6037"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="loc-lng">Longitude</Label>
                            <Input
                              id="loc-lng"
                              type="number"
                              step="any"
                              value={locationForm.longitude}
                              onChange={(e) => setLocationForm(prev => ({ ...prev, longitude: e.target.value }))}
                              placeholder="e.g., -0.1870"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="loc-radius">Radius (meters)</Label>
                          <Input
                            id="loc-radius"
                            type="number"
                            value={locationForm.radius_meters}
                            onChange={(e) => setLocationForm(prev => ({ ...prev, radius_meters: e.target.value }))}
                            placeholder="e.g., 100"
                          />
                          <p className="text-xs text-muted-foreground">
                            The geofence radius in meters. Users must be within this distance to check in.
                          </p>
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLocationDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveLocation} disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              {editingLocation ? "Update" : "Create"}
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="text-center">Coordinates</TableHead>
                        <TableHead className="text-center">Radius</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.map((loc) => (
                        <TableRow key={loc.id}>
                          <TableCell className="font-medium">{loc.name}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {loc.address || "No address"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs font-mono">
                              {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{loc.radius_meters}m</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {loc.is_active ? (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditLocation(loc)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete("location", loc.id, loc.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Permissions Reference Tab */}
            <TabsContent value="permissions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Permission Reference</CardTitle>
                  <CardDescription>
                    Complete list of all available permissions in the system. Use this as a reference when configuring roles.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search permissions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Accordion type="multiple" className="w-full">
                    {Object.entries(permissionsByCategory).map(([category, perms]) => {
                      const filteredPerms = perms.filter(
                        p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             p.key.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      
                      if (filteredPerms.length === 0) return null
                      
                      return (
                        <AccordionItem key={category} value={category}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{category}</span>
                              <Badge variant="outline">{filteredPerms.length} permissions</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Permission</TableHead>
                                  <TableHead>Key</TableHead>
                                  <TableHead>Description</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredPerms.map((perm) => (
                                  <TableRow key={perm.key}>
                                    <TableCell className="font-medium">{perm.name}</TableCell>
                                    <TableCell>
                                      <code className="text-xs bg-muted px-2 py-1 rounded">{perm.key}</code>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{perm.description}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* View Role Dialog */}
          <Dialog open={isViewRoleDialogOpen} onOpenChange={setIsViewRoleDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {viewingRole?.display_name}
                </DialogTitle>
                <DialogDescription>
                  {viewingRole?.description || "No description provided"}
                </DialogDescription>
              </DialogHeader>
              
              {viewingRole && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{viewingRole.name}</Badge>
                    {viewingRole.is_system ? (
                      <Badge className="bg-blue-100 text-blue-800">System Role</Badge>
                    ) : (
                      <Badge variant="secondary">Custom Role</Badge>
                    )}
                    {viewingRole.is_active ? (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Permissions ({viewingRole.permissions?.length || 0})
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {viewingRole.permissions?.map((permKey) => (
                        <div key={permKey} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                          <Check className="h-3 w-3 text-green-600" />
                          <span>{permissions[permKey]?.name || permKey}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {viewingRole.location_access && viewingRole.location_access.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Location Access ({viewingRole.location_access.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {viewingRole.location_access.map((locId) => {
                            const loc = locations.find(l => l.id === locId)
                            return (
                              <Badge key={locId} variant="outline">
                                <MapPin className="h-3 w-3 mr-1" />
                                {loc?.name || locId}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {viewingRole.department_access && viewingRole.department_access.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Department Access ({viewingRole.department_access.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {viewingRole.department_access.map((deptId) => {
                            const dept = departments.find(d => d.id === deptId)
                            return (
                              <Badge key={deptId} variant="outline">
                                <Building className="h-3 w-3 mr-1" />
                                {dept?.name || deptId}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewRoleDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setIsViewRoleDialogOpen(false)
                  if (viewingRole) handleEditRole(viewingRole)
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )
}

