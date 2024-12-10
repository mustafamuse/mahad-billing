import { NextResponse } from 'next/server'

import { z } from 'zod'

import { getDashboardData } from '@/lib/services/admin-dashboard'
import type { ProcessedStudent, TableStudent } from '@/lib/types'

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.string().optional(),
  search: z.string().optional(),
  discountType: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

function transformToTableStudent(student: ProcessedStudent): TableStudent {
  return {
    id: student.id,
    name: student.name,
    status: student.status,
    guardian: {
      name: student.guardian.name,
      email: student.guardian.email,
    },
    currentPeriodEnd: student.currentPeriodEnd,
    monthlyAmount: student.monthlyAmount,
    discount: {
      type: student.discount.type,
      amount: student.discount.amount,
    },
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const params = QuerySchema.parse(Object.fromEntries(searchParams))

    const dashboardData = await getDashboardData()

    // Filter and sort students
    let filteredStudents = [...dashboardData.students]

    // Apply status filter
    if (params.status) {
      filteredStudents = filteredStudents.filter(
        (student) => student.status === params.status
      )
    }

    // Apply search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase()
      filteredStudents = filteredStudents.filter((student) =>
        student.name.toLowerCase().includes(searchLower)
      )
    }

    // Apply discount filter
    if (params.discountType && params.discountType !== 'all') {
      filteredStudents = filteredStudents.filter(
        (student) => student.discount.type === params.discountType
      )
    }

    // Apply sorting
    if (params.sortBy) {
      filteredStudents.sort((a, b) => {
        const aValue = a[params.sortBy as keyof ProcessedStudent]
        const bValue = b[params.sortBy as keyof ProcessedStudent]
        if (aValue === undefined || bValue === undefined) return 0
        const order = params.sortOrder === 'desc' ? -1 : 1
        return aValue < bValue ? -order : order
      })
    }

    // Apply pagination
    const start = (params.page - 1) * params.limit
    const paginatedStudents = filteredStudents
      .slice(start, start + params.limit)
      .map(transformToTableStudent)

    return NextResponse.json({
      students: paginatedStudents,
      hasMore: filteredStudents.length > start + params.limit,
      nextCursor:
        filteredStudents.length > start + params.limit ? params.page + 1 : null,
      total: filteredStudents.length,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
