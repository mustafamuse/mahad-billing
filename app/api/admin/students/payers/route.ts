import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all' // 'all', 'with-payer', 'without-payer', 'with-stripe', 'without-stripe'

    // Base query to get all students with their payer information
    const baseQuery = {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        batchId: true,
        payerId: true,
        batch: {
          select: {
            name: true,
          },
        },
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            stripeCustomerId: true,
            relationship: true,
          },
        },
      },
      orderBy: [{ payerId: 'asc' }, { name: 'asc' }],
    }

    // Apply filters
    let whereClause = {}

    switch (filter) {
      case 'with-payer':
        whereClause = { payerId: { not: null } }
        break
      case 'without-payer':
        whereClause = { payerId: null }
        break
      case 'with-stripe':
        whereClause = {
          payer: {
            stripeCustomerId: { not: null },
          },
        }
        break
      case 'without-stripe':
        whereClause = {
          payerId: { not: null },
          payer: {
            stripeCustomerId: null,
          },
        }
        break
      default:
        // 'all' - no filter
        break
    }

    // Get students with applied filters
    const students = await prisma.student.findMany({
      ...baseQuery,
      where: whereClause,
    })

    // Calculate summary statistics
    const totalStudents = students.length
    const withPayer = students.filter((s) => s.payerId).length
    const withoutPayer = totalStudents - withPayer
    const withStripe = students.filter((s) => s.payer?.stripeCustomerId).length
    const withoutStripe = withPayer - withStripe

    // Group students by payer for better organization
    const studentsByPayer: Record<string, any[]> = {}
    const studentsWithoutPayer: any[] = []

    students.forEach((student) => {
      if (student.payerId && student.payer) {
        const payerId = student.payerId
        if (!studentsByPayer[payerId]) {
          studentsByPayer[payerId] = []
        }
        studentsByPayer[payerId].push(student)
      } else {
        studentsWithoutPayer.push(student)
      }
    })

    // Format the response
    const payerGroups = Object.entries(studentsByPayer)
      .map(([payerId, students]) => {
        const payer = students[0].payer
        return {
          payer: {
            id: payerId,
            name: payer.name,
            email: payer.email,
            phone: payer.phone,
            stripeCustomerId: payer.stripeCustomerId,
            relationship: payer.relationship,
            hasStripe: !!payer.stripeCustomerId,
          },
          students,
          studentCount: students.length,
        }
      })
      .sort((a, b) => {
        // Sort by whether they have Stripe ID first, then by name
        if (!!a.payer.stripeCustomerId !== !!b.payer.stripeCustomerId) {
          return !!a.payer.stripeCustomerId ? 1 : -1 // Without Stripe first
        }
        return a.payer.name.localeCompare(b.payer.name)
      })

    return NextResponse.json({
      summary: {
        totalStudents,
        withPayer,
        withoutPayer,
        withStripe,
        withoutStripe,
      },
      payerGroups,
      studentsWithoutPayer,
    })
  } catch (error) {
    console.error('Failed to fetch student payers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student payers' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
