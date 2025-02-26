import { NextResponse } from 'next/server'

import { z } from 'zod'

import { prisma } from '@/lib/db'
import { syncStripeDataToDatabase } from '@/lib/services/stripe-sync'
import { stripeServerClient } from '@/lib/stripe'

// Validation schema for the request body
const paymentSuccessSchema = z.object({
  studentId: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { studentId } = paymentSuccessSchema.parse(body)

    if (!studentId) {
      console.log('❌ [PAYMENT-SUCCESS] No student ID provided')
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    console.log(
      `🔍 [PAYMENT-SUCCESS] Syncing data for student ID: ${studentId}`
    )

    // Find the student with their payer information
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { payer: true },
    })

    if (!student) {
      console.log(`❌ [PAYMENT-SUCCESS] Student not found: ${studentId}`)
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    let syncedData = false
    let stripeCustomerId = null

    // If the student has a payer with a Stripe customer ID, sync the data
    if (student.payer?.stripeCustomerId) {
      stripeCustomerId = student.payer.stripeCustomerId
      console.log(
        `💳 [PAYMENT-SUCCESS] Found Stripe customer ID: ${stripeCustomerId}`
      )

      // Verify this customer still exists in Stripe
      try {
        await stripeServerClient.customers.retrieve(stripeCustomerId)
        console.log(
          `✅ [PAYMENT-SUCCESS] Verified Stripe customer exists: ${stripeCustomerId}`
        )

        console.log(
          `🔄 [PAYMENT-SUCCESS] Syncing Stripe data for customer: ${stripeCustomerId}`
        )
        await syncStripeDataToDatabase(stripeCustomerId)
        syncedData = true

        console.log(
          `✅ [PAYMENT-SUCCESS] Synced Stripe data for customer: ${stripeCustomerId}`
        )
      } catch (error) {
        console.error(
          `❌ [PAYMENT-SUCCESS] Stripe customer ID ${stripeCustomerId} is invalid or deleted`
        )
        console.log(error)
        // Continue to try other methods
        stripeCustomerId = null
      }
    }

    // If we couldn't sync with the existing customer ID, try other methods
    if (!syncedData) {
      console.log(
        `⚠️ [PAYMENT-SUCCESS] Need to find alternative customer information for student`
      )

      // Array to hold potential emails to check
      const emailsToCheck: string[] = []

      // Add payer email if available
      if (student.payer?.email) {
        emailsToCheck.push(student.payer.email)
      }

      // Add student email if available
      if (student.email) {
        emailsToCheck.push(student.email)
      }

      // Check for existing customers with any of these emails
      for (const email of emailsToCheck) {
        if (syncedData) break // Skip if we already synced data

        console.log(
          `📧 [PAYMENT-SUCCESS] Searching for Stripe customer by email: ${email}`
        )

        try {
          const customers = await stripeServerClient.customers.list({
            email: email,
            limit: 5, // Check more than one in case there are duplicates
          })

          if (customers.data.length > 0) {
            // Log all found customers for debugging
            customers.data.forEach((customer, index) => {
              console.log(
                `📝 [PAYMENT-SUCCESS] Found Stripe customer ${index + 1}: ID=${customer.id}, Created=${new Date(customer.created * 1000).toISOString()}`
              )
            })

            // Use the most recently created customer
            const mostRecentCustomer = customers.data.sort(
              (a, b) => b.created - a.created
            )[0]
            stripeCustomerId = mostRecentCustomer.id

            console.log(
              `✅ [PAYMENT-SUCCESS] Using most recent Stripe customer: ${stripeCustomerId}`
            )

            // Check if we need to update or create a payer
            if (student.payer) {
              // Update the existing payer with the Stripe customer ID if needed
              if (student.payer.stripeCustomerId !== stripeCustomerId) {
                console.log(
                  `🔄 [PAYMENT-SUCCESS] Updating payer with Stripe customer ID: ${stripeCustomerId}`
                )
                await prisma.payer.update({
                  where: { id: student.payer.id },
                  data: { stripeCustomerId },
                })
              }
            } else {
              // Create a new payer
              console.log(
                `🔄 [PAYMENT-SUCCESS] Creating new payer with email: ${email}`
              )

              const newPayer = await prisma.payer.create({
                data: {
                  email: email,
                  name: email === student.email ? student.name : 'Unknown',
                  phone: '',
                  stripeCustomerId,
                  relationship: email === student.email ? 'Self' : 'Unknown',
                  students: {
                    connect: { id: student.id },
                  },
                },
              })

              console.log(
                `✅ [PAYMENT-SUCCESS] Created new payer: ${newPayer.id}`
              )
            }

            // Sync the data
            console.log(
              `🔄 [PAYMENT-SUCCESS] Syncing Stripe data for customer: ${stripeCustomerId}`
            )
            await syncStripeDataToDatabase(stripeCustomerId)
            syncedData = true

            console.log(
              `✅ [PAYMENT-SUCCESS] Synced Stripe data for customer: ${stripeCustomerId}`
            )
          }
        } catch (error) {
          console.error(
            `❌ [PAYMENT-SUCCESS] Error searching for customer by email ${email}:`,
            error
          )
          // Continue to try other methods
        }
      }
    }

    // If we still don't have a customer ID, check recent checkout sessions
    if (!syncedData) {
      console.log(
        `🔍 [PAYMENT-SUCCESS] Checking recent checkout sessions for student ID: ${studentId}`
      )

      try {
        // Get recent checkout sessions
        const checkoutSessions =
          await stripeServerClient.checkout.sessions.list({
            limit: 20, // Check more sessions to increase chances of finding a match
            expand: ['data.customer'],
            created: {
              // Look at sessions created in the last 24 hours
              gte: Math.floor(Date.now() / 1000) - 86400,
            },
          })

        console.log(
          `📝 [PAYMENT-SUCCESS] Found ${checkoutSessions.data.length} recent checkout sessions`
        )

        // Look for a session with this student ID in the metadata
        for (const session of checkoutSessions.data) {
          if (
            session.metadata &&
            session.metadata.studentIds &&
            session.metadata.studentIds.includes(studentId)
          ) {
            console.log(
              `✅ [PAYMENT-SUCCESS] Found checkout session with student ID: ${session.id}`
            )

            if (session.customer) {
              const customerId =
                typeof session.customer === 'string'
                  ? session.customer
                  : session.customer.id

              console.log(
                `💳 [PAYMENT-SUCCESS] Found customer ID from session: ${customerId}`
              )

              // Get customer details
              const customer =
                await stripeServerClient.customers.retrieve(customerId)

              // Check if we have a payer with this email
              if (customer.email) {
                let payer = await prisma.payer.findUnique({
                  where: { email: customer.email as string },
                })

                if (payer) {
                  // Update the payer with the Stripe customer ID if needed
                  if (payer.stripeCustomerId !== customerId) {
                    console.log(
                      `🔄 [PAYMENT-SUCCESS] Updating payer with Stripe customer ID: ${customerId}`
                    )
                    await prisma.payer.update({
                      where: { id: payer.id },
                      data: {
                        stripeCustomerId: customerId,
                        students: {
                          connect: { id: student.id },
                        },
                      },
                    })
                  } else if (!student.payerId || student.payerId !== payer.id) {
                    // Connect the student to this payer if not already connected
                    console.log(
                      `🔄 [PAYMENT-SUCCESS] Connecting student to existing payer: ${payer.id}`
                    )
                    await prisma.student.update({
                      where: { id: student.id },
                      data: { payerId: payer.id },
                    })
                  }
                } else {
                  // Create a new payer
                  console.log(
                    `🔄 [PAYMENT-SUCCESS] Creating new payer with email: ${customer.email}`
                  )
                  payer = await prisma.payer.create({
                    data: {
                      email: customer.email as string,
                      name: customer.name || '',
                      phone: customer.phone || '',
                      stripeCustomerId: customerId,
                      relationship:
                        student.email === customer.email ? 'Self' : 'Unknown',
                      students: {
                        connect: { id: student.id },
                      },
                    },
                  })
                }

                // Sync the data
                console.log(
                  `🔄 [PAYMENT-SUCCESS] Syncing Stripe data for customer: ${customerId}`
                )
                await syncStripeDataToDatabase(customerId)
                syncedData = true

                console.log(
                  `✅ [PAYMENT-SUCCESS] Found and synced Stripe data for customer from checkout session`
                )
                break
              }
            }
          }
        }
      } catch (error) {
        console.error(
          `❌ [PAYMENT-SUCCESS] Error checking checkout sessions:`,
          error
        )
      }
    }

    // If we couldn't sync any data
    if (!syncedData) {
      console.log(`⚠️ [PAYMENT-SUCCESS] No Stripe data found to sync`)
      return NextResponse.json({
        success: false,
        syncedData: false,
        message: 'No Stripe data found to sync',
      })
    }

    return NextResponse.json({
      success: true,
      syncedData: true,
      message: 'Stripe data synced successfully',
    })
  } catch (error) {
    console.error('❌ [PAYMENT-SUCCESS] Error syncing Stripe data:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
        syncedData: false,
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
