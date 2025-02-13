// import { NextRequest, NextResponse } from 'next/server'

// import { prisma } from '@/lib/db'

// export async function POST(
//   req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const { id } = params
//     const { siblingName } = await req.json()

//     // Verify student exists and is in Irshād 4 batch
//     const student = await prisma.student.findFirst({
//       where: {
//         id,
//         batch: {
//           name: 'Irshād 4',
//         },
//       },
//       include: {
//         siblingGroup: true,
//       },
//     })

//     if (!student) {
//       return NextResponse.json(
//         { error: 'Student not found in Irshād 4 batch' },
//         { status: 404 }
//       )
//     }

//     // Find or create sibling
//     const sibling = await prisma.student.findFirst({
//       where: {
//         name: siblingName,
//         batch: {
//           name: 'Irshād 4',
//         },
//       },
//     })

//     if (!sibling) {
//       return NextResponse.json(
//         { error: 'Sibling not found in Irshād 4 batch' },
//         { status: 404 }
//       )
//     }

//     // If student has no sibling group, create one
//     if (!student.siblingGroup) {
//       const newSiblingGroup = await prisma.siblingGroup.create({
//         data: {
//           students: {
//             connect: [{ id: student.id }, { id: sibling.id }],
//           },
//         },
//         include: {
//           students: {
//             select: {
//               id: true,
//               name: true,
//             },
//           },
//         },
//       })

//       return NextResponse.json(newSiblingGroup)
//     }

//     // Add sibling to existing group
//     const updatedSiblingGroup = await prisma.siblingGroup.update({
//       where: {
//         id: student.siblingGroup.id,
//       },
//       data: {
//         students: {
//           connect: { id: sibling.id },
//         },
//       },
//       include: {
//         students: {
//           select: {
//             id: true,
//             name: true,
//           },
//         },
//       },
//     })

//     return NextResponse.json(updatedSiblingGroup)
//   } catch (error) {
//     console.error('Failed to add sibling:', error)
//     return NextResponse.json(
//       { error: 'Failed to add sibling' },
//       { status: 500 }
//     )
//   }
// }

// export const dynamic = 'force-dynamic'
