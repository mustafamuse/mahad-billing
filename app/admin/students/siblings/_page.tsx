// 'use client'

// import { useCallback, useEffect, useState } from 'react'

// import { useRouter } from 'next/navigation'

// import { zodResolver } from '@hookform/resolvers/zod'
// import { useForm } from 'react-hook-form'
// import { toast } from 'sonner'
// import { z } from 'zod'

// import { Button } from '@/components/ui/button'
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from '@/components/ui/card'
// import { Checkbox } from '@/components/ui/checkbox'
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from '@/components/ui/dialog'
// import { Label } from '@/components/ui/label'
// import { Switch } from '@/components/ui/switch'
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table'
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from '@/components/ui/tooltip'

// // Schema for the form
// const siblingFormSchema = z.object({
//   studentIds: z.array(z.string()).min(2, 'Select at least 2 students'),
// })

// type Student = {
//   id: string
//   name: string
//   siblingGroupId: string | null
//   siblingGroup?: {
//     students: {
//       id: string
//       name: string
//     }[]
//   } | null
// }

// interface SiblingGroup {
//   id: string
//   students: {
//     id: string
//     name: string
//   }[]
// }

// export default function SiblingsPage() {
//   // const router = useRouter()
//   const [students, setStudents] = useState<Student[]>([])
//   const [siblingGroupCount, setSiblingGroupCount] = useState(0)
//   const [isLoading, setIsLoading] = useState(false)
//   // const [showSiblingGroups, setShowSiblingGroups] = useState(false)
//   const [hideAssignedStudents, setHideAssignedStudents] = useState(true)

//   const form = useForm<z.infer<typeof siblingFormSchema>>({
//     resolver: zodResolver(siblingFormSchema),
//     defaultValues: {
//       studentIds: [],
//     },
//   })

//   const { setValue, watch } = form
//   const selectedIds = watch('studentIds')

//   // Load students on mount
//   useEffect(() => {
//     fetchStudents()
//   }, [])

//   const fetchStudents = async () => {
//     try {
//       const response = await fetch('/api/admin/students')
//       const data = await response.json()
//       setStudents(data.students)
//       setSiblingGroupCount(data.siblingGroupCount)
//     } catch (error) {
//       toast.error('Failed to fetch students')
//     }
//   }

//   const handleCheckboxChange = useCallback(
//     (studentId: string, checked: boolean) => {
//       const currentIds = selectedIds
//       const newIds = checked
//         ? [...currentIds, studentId]
//         : currentIds.filter((id) => id !== studentId)
//       setValue('studentIds', newIds)
//     },
//     [selectedIds, setValue]
//   )

//   const onSubmit = async () => {
//     if (selectedIds.length < 2) {
//       toast.error('Select at least 2 students')
//       return
//     }

//     setIsLoading(true)
//     try {
//       const response = await fetch('/api/admin/siblings', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ studentIds: selectedIds }),
//       })

//       if (!response.ok) throw new Error('Failed to update siblings')

//       toast.success('Successfully updated siblings')
//       setValue('studentIds', []) // Clear selection
//       fetchStudents() // Refresh the list
//     } catch (error) {
//       toast.error('Failed to update siblings')
//       console.error(error)
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   const removeSiblingGroup = async (groupId: string) => {
//     try {
//       const response = await fetch(`/api/admin/siblings/${groupId}`, {
//         method: 'DELETE',
//       })

//       if (!response.ok) throw new Error('Failed to remove sibling group')

//       toast.success('Successfully removed sibling group')
//       fetchStudents() // Refresh the list
//     } catch (error) {
//       toast.error('Failed to remove sibling group')
//       console.error(error)
//     }
//   }

//   // Group students by sibling groups
//   const siblingGroups = students.reduce((groups: SiblingGroup[], student) => {
//     if (student.siblingGroup) {
//       const existingGroup = groups.find((g) => g.id === student.siblingGroupId)
//       if (!existingGroup) {
//         groups.push({
//           id: student.siblingGroupId!,
//           students: student.siblingGroup.students,
//         })
//       }
//     }
//     return groups
//   }, [])

//   // Filter students based on hideAssignedStudents setting
//   const filteredStudents = students.filter(
//     (student) => !hideAssignedStudents || student.siblingGroupId === null
//   )

//   const updateAllToBatch = async () => {
//     setIsLoading(true)
//     try {
//       const response = await fetch('/api/admin/students', {
//         method: 'PUT',
//       })

//       if (!response.ok) throw new Error('Failed to update batch')

//       const data = await response.json()
//       toast.success(data.message)
//     } catch (error) {
//       toast.error('Failed to update students to Irshād 4 batch')
//       console.error(error)
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <div className="container mx-auto py-10">
//       <Card>
//         <CardHeader>
//           <div className="flex items-center justify-between">
//             <div>
//               <CardTitle>Manage Siblings</CardTitle>
//               <CardDescription>
//                 Select students to mark them as siblings. Students in the same
//                 sibling group will receive family discounts.
//               </CardDescription>
//             </div>
//             <div className="flex items-center gap-4">
//               <Button
//                 variant="outline"
//                 onClick={updateAllToBatch}
//                 disabled={isLoading}
//               >
//                 Update All to Irshād 4
//               </Button>
//               <TooltipProvider>
//                 <Tooltip>
//                   <TooltipTrigger asChild>
//                     <div className="flex items-center gap-2">
//                       <Label htmlFor="hide-assigned" className="text-sm">
//                         Hide Assigned Students
//                       </Label>
//                       <Switch
//                         id="hide-assigned"
//                         checked={hideAssignedStudents}
//                         onCheckedChange={setHideAssignedStudents}
//                       />
//                     </div>
//                   </TooltipTrigger>
//                   <TooltipContent>
//                     <p>Hide students who are already in sibling groups</p>
//                   </TooltipContent>
//                 </Tooltip>
//               </TooltipProvider>

//               <Dialog>
//                 <DialogTrigger asChild>
//                   <Button variant="outline">
//                     View Sibling Groups ({siblingGroupCount})
//                   </Button>
//                 </DialogTrigger>
//                 <DialogContent className="max-h-[80vh] overflow-y-auto">
//                   <DialogHeader>
//                     <DialogTitle>Sibling Groups</DialogTitle>
//                     <DialogDescription>
//                       Manage existing sibling groups
//                     </DialogDescription>
//                   </DialogHeader>
//                   <div className="space-y-4">
//                     {siblingGroups.map((group) => (
//                       <Card key={group.id}>
//                         <CardHeader className="p-4">
//                           <div className="flex items-center justify-between">
//                             <CardTitle className="text-sm font-medium">
//                               Group {group.id.slice(0, 8)}
//                             </CardTitle>
//                             <Button
//                               variant="destructive"
//                               size="sm"
//                               onClick={() => removeSiblingGroup(group.id)}
//                             >
//                               Remove Group
//                             </Button>
//                           </div>
//                         </CardHeader>
//                         <CardContent className="p-4 pt-0">
//                           <ul className="list-inside list-disc space-y-1">
//                             {group.students.map((student) => (
//                               <li key={student.id}>{student.name}</li>
//                             ))}
//                           </ul>
//                         </CardContent>
//                       </Card>
//                     ))}
//                   </div>
//                 </DialogContent>
//               </Dialog>
//             </div>
//           </div>
//         </CardHeader>
//         <CardContent>
//           <div className="space-y-4">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead className="w-12">Select</TableHead>
//                   <TableHead>Name</TableHead>
//                   <TableHead>Current Sibling Group</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {filteredStudents.map((student) => (
//                   <TableRow key={student.id}>
//                     <TableCell>
//                       <Checkbox
//                         checked={selectedIds.includes(student.id)}
//                         onCheckedChange={(checked) =>
//                           handleCheckboxChange(student.id, checked as boolean)
//                         }
//                       />
//                     </TableCell>
//                     <TableCell>{student.name}</TableCell>
//                     <TableCell>
//                       {student.siblingGroupId ? (
//                         <div className="flex items-center gap-2">
//                           <span className="text-sm text-muted-foreground">
//                             Group {student.siblingGroupId.slice(0, 8)}
//                           </span>
//                           <TooltipProvider>
//                             <Tooltip>
//                               <TooltipTrigger>
//                                 <span className="text-sm text-muted-foreground">
//                                   (
//                                   {student.siblingGroup?.students
//                                     .map((s) => s.name)
//                                     .join(', ')}
//                                   )
//                                 </span>
//                               </TooltipTrigger>
//                               <TooltipContent>
//                                 <p>Siblings in this group</p>
//                               </TooltipContent>
//                             </Tooltip>
//                           </TooltipProvider>
//                         </div>
//                       ) : (
//                         <span className="text-sm text-muted-foreground">
//                           No siblings
//                         </span>
//                       )}
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>

//             <div className="flex justify-end space-x-4">
//               <Button
//                 variant="outline"
//                 onClick={() => setValue('studentIds', [])}
//                 disabled={isLoading}
//               >
//                 Clear Selection
//               </Button>
//               <Button
//                 onClick={onSubmit}
//                 disabled={selectedIds.length < 2 || isLoading}
//               >
//                 {isLoading ? 'Updating...' : 'Update Siblings'}
//               </Button>
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }
