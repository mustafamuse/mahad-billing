'use client'

import { useState, useEffect } from 'react'

import { Loader2, Plus, Trash, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { SiblingHeader } from './sibling-header'

interface Student {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string
  batchId: string | null
  batch?: {
    name: string
  } | null
}

interface SiblingGroup {
  id: string
  students: Student[]
}

export default function SiblingGroupsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [siblingGroups, setSiblingGroups] = useState<SiblingGroup[]>([])
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([])
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalStudents: 0,
    unassignedStudents: 0,
  })

  // Tabs and dialogs state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [createSearchTerm, setCreateSearchTerm] = useState('')
  const [editSearchTerm, setEditSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Student[]>([])
  const [isSearchingApi, setIsSearchingApi] = useState(false)

  // Selection state
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [studentsToAdd, setStudentsToAdd] = useState<string[]>([])
  const [studentsToRemove, setStudentsToRemove] = useState<string[]>([])
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // New state for all students
  const [allStudentsData, setAllStudentsData] = useState<Student[]>([])

  // Debounce search term for main list
  useEffect(() => {
    setIsSearching(true)
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch sibling groups
  const fetchSiblingGroups = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/siblings')

      if (!response.ok) {
        throw new Error('Failed to fetch sibling groups')
      }

      const data = await response.json()
      console.log('API response:', data) // Debug log
      setSiblingGroups(data.siblingGroups || [])
      setUnassignedStudents(data.studentsWithoutSiblings || []) // Fixed: using correct property name
      setStats({
        totalGroups: data.totalGroups || 0,
        totalStudents:
          data.totalStudentsWithSiblings + data.totalStudentsWithoutSiblings ||
          0,
        unassignedStudents: data.totalStudentsWithoutSiblings || 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
      console.error('Error fetching sibling groups:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch all students
  const fetchAllStudents = async () => {
    try {
      const response = await fetch('/api/admin/siblings/all-students')

      if (!response.ok) {
        throw new Error('Failed to fetch all students')
      }

      const data = await response.json()
      console.log('All students API response:', data)
      setAllStudentsData(data.students || [])
    } catch (err) {
      console.error('Error fetching all students:', err)
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchSiblingGroups()
    fetchAllStudents()
  }, [])

  // Filter students based on search term for main list
  const filteredUnassignedStudents = unassignedStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (student.email &&
        student.email
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase())) ||
      (student.phone && student.phone.includes(debouncedSearchTerm))
  )

  // Get the selected group for editing
  const selectedGroup = selectedGroupId
    ? siblingGroups.find((group) => group.id === selectedGroupId)
    : null

  // Enhanced getAllStudents function to use the fetched all students data
  const getAllStudents = () => {
    // If we have all students data from the API, use that
    if (allStudentsData.length > 0) {
      console.log('Using all students data from API:', allStudentsData.length)
      return allStudentsData
    }

    // Fallback to the old method if API data isn't available
    console.log('Falling back to local student data')
    const localStudents = [...unassignedStudents]
    siblingGroups.forEach((group) => {
      localStudents.push(...group.students)
    })

    // Deduplicate students by ID
    const uniqueStudents: Student[] = []
    const seenIds = new Set<string>()

    localStudents.forEach((student) => {
      if (!seenIds.has(student.id)) {
        seenIds.add(student.id)
        uniqueStudents.push(student)
      }
    })

    console.log('Total unique students found (local):', uniqueStudents.length)
    return uniqueStudents
  }

  // Enhanced getAddableStudents function to include all students
  const getAddableStudents = () => {
    if (!selectedGroup) return getAllStudents() // Return all students if no group is selected

    // Get all unique students
    const allUniqueStudents = getAllStudents()

    // Get IDs of students already in the selected group
    const groupStudentIds = selectedGroup.students.map((student) => student.id)

    // Return all students that aren't already in this group or marked to be added
    return allUniqueStudents.filter(
      (student) =>
        !groupStudentIds.includes(student.id) &&
        !studentsToAdd.includes(student.id)
    )
  }

  // Filter students for create dialog
  const allStudents = getAllStudents()
  console.log('All students count for create dialog:', allStudents.length)

  // Search students API function
  const searchStudents = async (
    searchTerm: string,
    excludeIds: string[] = []
  ) => {
    if (!searchTerm.trim() && excludeIds.length === 0) {
      return // Don't search if there's no search term and no exclusions
    }

    setIsSearchingApi(true)
    try {
      // Build the URL with query parameters
      const params = new URLSearchParams()
      params.append('q', searchTerm)

      // Add exclude IDs if any
      excludeIds.forEach((id) => params.append('exclude', id))

      const response = await fetch(
        `/api/admin/students/search?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error('Failed to search students')
      }

      const data = await response.json()
      console.log('Search results:', data)
      setSearchResults(data.students || [])
    } catch (err) {
      console.error('Error searching students:', err)
      setSearchResults([])
    } finally {
      setIsSearchingApi(false)
    }
  }

  // Update search effect for create dialog
  useEffect(() => {
    if (isCreateDialogOpen) {
      const timer = setTimeout(() => {
        searchStudents(createSearchTerm)
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [isCreateDialogOpen, createSearchTerm])

  // Update search effect for edit dialog
  useEffect(() => {
    if (isEditDialogOpen && selectedGroup) {
      const timer = setTimeout(() => {
        // Exclude students already in the group
        const excludeIds = selectedGroup.students.map((s) => s.id)
        searchStudents(editSearchTerm, excludeIds)
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [isEditDialogOpen, editSearchTerm, selectedGroup])

  // Update the filtered students for create dialog
  const filteredAllStudents = createSearchTerm
    ? searchResults
    : getAllStudents()

  // Get addable students for the edit dialog
  const addableStudents = getAddableStudents()
  console.log('Addable students count:', addableStudents.length)

  // Update the filtered students for edit dialog
  const filteredAddableStudents = editSearchTerm
    ? searchResults
    : addableStudents

  // Enhanced logging for create dialog
  useEffect(() => {
    if (isCreateDialogOpen) {
      console.log('Create search term:', createSearchTerm)
      console.log('All students count:', allStudents.length)
      console.log('Filtered students count:', filteredAllStudents.length)
      console.log('First few all students:', allStudents.slice(0, 3))
      console.log(
        'First few filtered students:',
        filteredAllStudents.slice(0, 3)
      )
    }
  }, [isCreateDialogOpen, createSearchTerm, allStudents, filteredAllStudents])

  // Enhanced logging for debugging
  useEffect(() => {
    if (isEditDialogOpen) {
      console.log('Edit search term:', editSearchTerm)
      console.log('Addable students count:', addableStudents.length)
      console.log(
        'Filtered addable students count:',
        filteredAddableStudents.length
      )
      console.log('First few addable students:', addableStudents.slice(0, 3))
      console.log(
        'First few filtered students:',
        filteredAddableStudents.slice(0, 3)
      )
      console.log('Selected group:', selectedGroup)
    }
  }, [
    isEditDialogOpen,
    editSearchTerm,
    addableStudents,
    filteredAddableStudents,
    selectedGroup,
  ])

  // Toggle student selection for create dialog
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  // Toggle student to add in edit dialog
  const toggleStudentToAdd = (studentId: string) => {
    console.log('Toggling student to add:', studentId)
    setStudentsToAdd((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  // Toggle student to remove in edit dialog
  const toggleStudentToRemove = (studentId: string) => {
    console.log('Toggling student to remove:', studentId)
    setStudentsToRemove((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  // Create new sibling group
  const handleCreateSiblingGroup = async () => {
    if (selectedStudents.length < 2) {
      toast.error('Please select at least 2 students to create a sibling group')
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch('/api/admin/siblings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: selectedStudents,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create sibling group')
      }

      toast.success('Sibling group created successfully')

      // Reset and refresh
      setSelectedStudents([])
      setIsCreateDialogOpen(false)
      fetchSiblingGroups()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create sibling group'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  // Open edit dialog
  const openEditDialog = (groupId: string) => {
    setSelectedGroupId(groupId)
    setStudentsToAdd([])
    setStudentsToRemove([])
    setEditSearchTerm('') // Reset search term when opening dialog
    setIsEditDialogOpen(true)

    // Log the current state for debugging
    console.log('Opening edit dialog for group:', groupId)
    console.log('Current unassigned students:', unassignedStudents)
    console.log('Current sibling groups:', siblingGroups)
  }

  // Open create dialog
  const openCreateDialog = () => {
    setSelectedStudents([])
    setCreateSearchTerm('') // Reset search term when opening dialog
    setIsCreateDialogOpen(true)

    // Log the current state for debugging
    console.log('Opening create dialog')
    console.log('Current all students:', getAllStudents())
  }

  // Update sibling group
  const handleUpdateSiblingGroup = async () => {
    if (!selectedGroupId) return

    if (studentsToAdd.length === 0 && studentsToRemove.length === 0) {
      setIsEditDialogOpen(false)
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch(`/api/admin/siblings/${selectedGroupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addStudentIds: studentsToAdd.length > 0 ? studentsToAdd : undefined,
          removeStudentIds:
            studentsToRemove.length > 0 ? studentsToRemove : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update sibling group')
      }

      const data = await response.json()

      if (data.deleted) {
        toast.success(
          'Sibling group was deleted because it had fewer than 2 students'
        )
      } else {
        toast.success('Sibling group updated successfully')
      }

      // Reset and refresh
      setStudentsToAdd([])
      setStudentsToRemove([])
      setIsEditDialogOpen(false)
      fetchSiblingGroups()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update sibling group'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  // Delete sibling group
  const handleDeleteSiblingGroup = async (groupId: string) => {
    setGroupToDelete(groupId)
    setIsDeleteDialogOpen(true)
  }

  // Confirm delete sibling group
  const confirmDeleteSiblingGroup = async () => {
    if (!groupToDelete) return

    try {
      const response = await fetch(`/api/admin/siblings/${groupToDelete}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete sibling group')
      }

      toast.success('Sibling group deleted successfully')
      fetchSiblingGroups()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete sibling group'
      )
    } finally {
      setGroupToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  // Update the renderSearchLoading function
  const renderSearchLoading = () => {
    if (!isSearching && !isSearchingApi) return null

    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Searching...</span>
      </div>
    )
  }

  // Render no results message
  const renderNoResults = (searchTerm: string, context: string) => {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">
          {searchTerm
            ? `No students match your search "${searchTerm}"`
            : `No ${context} found`}
        </p>
        {searchTerm && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              if (context === 'create') {
                setCreateSearchTerm('')
              } else if (context === 'edit') {
                setEditSearchTerm('')
              } else {
                setSearchTerm('')
              }
            }}
          >
            Clear Search
          </Button>
        )}
      </div>
    )
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiblingHeader />
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Loading sibling groups...
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiblingHeader />
        <div className="flex-1 space-y-4 p-8 pt-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
              <Button className="mt-4" onClick={() => fetchSiblingGroups()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiblingHeader />
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Sibling Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGroups}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Students in Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalStudents - stats.unassignedStudents}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unassigned Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.unassignedStudents}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Button */}
        <div className="flex justify-end">
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Sibling Group
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="groups">
          <TabsList>
            <TabsTrigger value="groups">Sibling Groups</TabsTrigger>
            <TabsTrigger value="unassigned">Unassigned Students</TabsTrigger>
          </TabsList>

          {/* Sibling Groups Tab */}
          <TabsContent value="groups" className="space-y-4">
            {siblingGroups.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="py-6 text-center">
                    <p className="text-muted-foreground">
                      No sibling groups found
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Sibling Group
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              siblingGroups.map((group) => (
                <Card key={group.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Sibling Group ({group.students.length} students)
                      </CardTitle>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(group.id)}
                        >
                          <UserPlus className="mr-1 h-4 w-4" />
                          Edit Group
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteSiblingGroup(group.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {group.students.map((student) => (
                        <div
                          key={student.id}
                          className="flex flex-col rounded-md border p-3"
                        >
                          <div className="font-medium">{student.name}</div>
                          {student.email && (
                            <div className="text-sm text-muted-foreground">
                              {student.email}
                            </div>
                          )}
                          {student.phone && (
                            <div className="text-sm text-muted-foreground">
                              {student.phone}
                            </div>
                          )}
                          <div className="mt-2 flex items-center space-x-2">
                            <Badge
                              variant={
                                student.status === 'ACTIVE'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {student.status}
                            </Badge>
                            {student.batch && (
                              <Badge variant="outline">
                                {student.batch.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Unassigned Students Tab */}
          <TabsContent value="unassigned">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Unassigned Students</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Input
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64"
                      />
                      {searchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setSearchTerm('')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Button variant="outline" onClick={openCreateDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Group
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isSearching && searchTerm ? (
                  renderSearchLoading()
                ) : filteredUnassignedStudents.length === 0 ? (
                  renderNoResults(searchTerm, 'unassigned students')
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredUnassignedStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex flex-col rounded-md border p-3"
                      >
                        <div className="font-medium">{student.name}</div>
                        {student.email && (
                          <div className="text-sm text-muted-foreground">
                            {student.email}
                          </div>
                        )}
                        {student.phone && (
                          <div className="text-sm text-muted-foreground">
                            {student.phone}
                          </div>
                        )}
                        <div className="mt-2 flex items-center space-x-2">
                          <Badge
                            variant={
                              student.status === 'ACTIVE'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {student.status}
                          </Badge>
                          {student.batch && (
                            <Badge variant="outline">
                              {student.batch.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Sibling Group Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Sibling Group</DialogTitle>
            <DialogDescription>
              Select at least 2 students to create a sibling group. Students in
              the same group will be recognized as siblings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Input
                placeholder="Search students..."
                value={createSearchTerm}
                onChange={(e) => setCreateSearchTerm(e.target.value)}
                className="flex-1"
              />
              {createSearchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setCreateSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="rounded-md border">
              <div className="flex items-center justify-between border-b bg-muted/50 p-3">
                <div className="font-medium">Select Students</div>
                <div className="text-sm text-muted-foreground">
                  {selectedStudents.length} selected
                </div>
              </div>

              {isSearching && createSearchTerm ? (
                renderSearchLoading()
              ) : filteredAllStudents.length === 0 ? (
                renderNoResults(createSearchTerm, 'create')
              ) : (
                <div className="grid max-h-[40vh] gap-2 overflow-y-auto p-3">
                  {filteredAllStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center space-x-3 rounded-md border p-2"
                    >
                      <Checkbox
                        id={`student-${student.id}`}
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() =>
                          toggleStudentSelection(student.id)
                        }
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`student-${student.id}`}
                          className="cursor-pointer font-medium"
                        >
                          {student.name}
                        </Label>
                        <div className="text-sm text-muted-foreground">
                          {student.email || student.phone || 'No contact info'}
                        </div>
                        <div className="mt-1 flex items-center space-x-2">
                          <Badge
                            variant={
                              student.status === 'ACTIVE'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {student.status}
                          </Badge>
                          {student.batch && (
                            <Badge variant="outline">
                              {student.batch.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedStudents([])
                setIsCreateDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSiblingGroup}
              disabled={selectedStudents.length < 2 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Sibling Group'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sibling Group Dialog */}
      {selectedGroup && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Sibling Group</DialogTitle>
              <DialogDescription>
                Add or remove students from this sibling group. A group must
                have at least 2 students.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Current Students */}
              <div className="rounded-md border">
                <div className="border-b bg-muted/50 p-3">
                  <div className="font-medium">Current Students in Group</div>
                </div>

                <div className="grid max-h-[30vh] gap-2 overflow-y-auto p-3">
                  {selectedGroup.students.map((student) => (
                    <div
                      key={student.id}
                      className={`flex items-center space-x-3 rounded-md border p-2 ${
                        studentsToRemove.includes(student.id)
                          ? 'border-destructive bg-destructive/10'
                          : ''
                      }`}
                      onClick={() => toggleStudentToRemove(student.id)}
                    >
                      <Checkbox
                        id={`remove-student-${student.id}`}
                        checked={studentsToRemove.includes(student.id)}
                        onCheckedChange={() =>
                          toggleStudentToRemove(student.id)
                        }
                      />
                      <div className="flex-1 cursor-pointer">
                        <Label
                          htmlFor={`remove-student-${student.id}`}
                          className="cursor-pointer font-medium"
                        >
                          {student.name}{' '}
                          {studentsToRemove.includes(student.id) &&
                            '(Will be removed)'}
                        </Label>
                        <div className="text-sm text-muted-foreground">
                          {student.email || student.phone || 'No contact info'}
                        </div>
                        <div className="mt-1 flex items-center space-x-2">
                          <Badge
                            variant={
                              student.status === 'ACTIVE'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {student.status}
                          </Badge>
                          {student.batch && (
                            <Badge variant="outline">
                              {student.batch.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Students */}
              <div className="rounded-md border">
                <div className="flex items-center justify-between border-b bg-muted/50 p-3">
                  <div className="font-medium">Add Students to Group</div>
                  <div className="relative">
                    <Input
                      placeholder="Search students..."
                      value={editSearchTerm}
                      onChange={(e) => setEditSearchTerm(e.target.value)}
                      className="w-64"
                    />
                    {editSearchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setEditSearchTerm('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {isSearching && editSearchTerm ? (
                  renderSearchLoading()
                ) : filteredAddableStudents.length === 0 ? (
                  renderNoResults(editSearchTerm, 'edit')
                ) : (
                  <div className="grid max-h-[30vh] gap-2 overflow-y-auto p-3">
                    {filteredAddableStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center space-x-3 rounded-md border p-2"
                        onClick={() => toggleStudentToAdd(student.id)}
                      >
                        <Checkbox
                          id={`add-student-${student.id}`}
                          checked={studentsToAdd.includes(student.id)}
                          onCheckedChange={() => toggleStudentToAdd(student.id)}
                        />
                        <div className="flex-1 cursor-pointer">
                          <Label
                            htmlFor={`add-student-${student.id}`}
                            className="cursor-pointer font-medium"
                          >
                            {student.name}{' '}
                            {studentsToAdd.includes(student.id) &&
                              '(Will be added)'}
                          </Label>
                          <div className="text-sm text-muted-foreground">
                            {student.email ||
                              student.phone ||
                              'No contact info'}
                          </div>
                          <div className="mt-1 flex items-center space-x-2">
                            <Badge
                              variant={
                                student.status === 'ACTIVE'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {student.status}
                            </Badge>
                            {student.batch && (
                              <Badge variant="outline">
                                {student.batch.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setStudentsToAdd([])
                  setStudentsToRemove([])
                  setIsEditDialogOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSiblingGroup}
                disabled={
                  (studentsToAdd.length === 0 &&
                    studentsToRemove.length === 0) ||
                  isProcessing ||
                  selectedGroup.students.length -
                    studentsToRemove.length +
                    studentsToAdd.length <
                    2
                }
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Sibling Group'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sibling Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sibling group? This will
              unlink all students from the group. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSiblingGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
