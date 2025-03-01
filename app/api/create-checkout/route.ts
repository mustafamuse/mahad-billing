import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { z } from 'zod'

import { prisma } from '@/lib/db'
import { stripeServerClient } from '@/lib/stripe'

// Validation schema for the request body
const createCheckoutSchema = z.object({
  students: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      monthlyRate: z.number().positive(),
    })
  ),
  amount: z.number().positive(),
  payerEmail: z.string().email().optional(),
  payerName: z.string().optional(),
  payerPhone: z.string().optional(),
})

export async function POST(req: Request) {
  console.log('🚀 [CREATE-CHECKOUT] Starting checkout session creation process')
  try {
    // Parse and validate the request body
    const body = await req.json()
    console.log(
      '📝 [CREATE-CHECKOUT] Request body:',
      JSON.stringify(body, null, 2)
    )

    const { students, amount, payerEmail, payerName, payerPhone } =
      createCheckoutSchema.parse(body)

    if (students.length === 0) {
      console.error('❌ [CREATE-CHECKOUT] No students provided in request')
      return NextResponse.json(
        { error: 'At least one student is required' },
        { status: 400 }
      )
    }

    console.log(
      `✅ [CREATE-CHECKOUT] Validated request with ${students.length} students and amount ${amount / 100} USD`
    )

    // Get the primary student (first in the array)
    const primaryStudentId = students[0].id

    // Fetch all selected students from the database to get their complete information
    const selectedStudents = await prisma.student.findMany({
      where: {
        id: {
          in: students.map((s) => s.id),
        },
      },
      include: {
        siblingGroup: {
          select: {
            id: true,
          },
        },
        payer: true,
      },
    })

    console.log(
      `📊 [CREATE-CHECKOUT] Found ${selectedStudents.length} students in database`
    )

    if (selectedStudents.length !== students.length) {
      console.error('❌ [CREATE-CHECKOUT] Some students not found in database')
      return NextResponse.json(
        { error: 'One or more students not found' },
        { status: 404 }
      )
    }

    // Check if we have a payer with an email
    let stripeCustomerId: string | undefined = undefined
    let existingPayer = selectedStudents[0].payer

    // Get primary student information to use for customer creation if needed
    const primaryStudent = selectedStudents[0]
    const studentEmail = primaryStudent.email
    const studentName = primaryStudent.name

    console.log(
      `🔍 [CREATE-CHECKOUT] Checking for existing records for student: ${primaryStudent.id}`
    )

    // First, check if the student already has a subscription in Stripe
    if (existingPayer?.stripeCustomerId) {
      console.log(
        `🔍 [CREATE-CHECKOUT] Student has payer with Stripe customer ID: ${existingPayer.stripeCustomerId}`
      )

      // Check if this customer has any active subscriptions in Stripe
      try {
        const subscriptions = await stripeServerClient.subscriptions.list({
          customer: existingPayer.stripeCustomerId,
          status: 'active',
          limit: 5,
        })

        if (subscriptions.data.length > 0) {
          console.log(
            `⚠️ [CREATE-CHECKOUT] Customer already has ${subscriptions.data.length} active subscriptions in Stripe`
          )

          // Log the subscription details for debugging
          subscriptions.data.forEach((sub, index) => {
            console.log(
              `📝 [CREATE-CHECKOUT] Existing subscription ${index + 1}: ID=${sub.id}, Status=${sub.status}, Created=${new Date(sub.created * 1000).toISOString()}`
            )
          })

          // We'll still proceed, but we've logged the existing subscriptions for awareness
        } else {
          console.log(
            `✅ [CREATE-CHECKOUT] Customer has no active subscriptions in Stripe`
          )
        }

        // Use the existing customer ID
        stripeCustomerId = existingPayer.stripeCustomerId
        console.log(
          `✅ [CREATE-CHECKOUT] Using existing payer's Stripe customer ID: ${stripeCustomerId}`
        )
      } catch (error) {
        console.error(
          `❌ [CREATE-CHECKOUT] Error checking for existing subscriptions:`,
          error
        )
        // Continue with the process despite the error
      }
    }

    // If we don't have a customer ID yet, try multiple methods to find one
    if (!stripeCustomerId) {
      console.log(
        `🔍 [CREATE-CHECKOUT] Looking for existing Stripe customer through multiple methods`
      )

      // Array to hold potential emails to check
      const emailsToCheck: string[] = []

      // Add payer email if provided
      if (payerEmail) {
        emailsToCheck.push(payerEmail)
      }

      // Add student email if available
      if (studentEmail) {
        emailsToCheck.push(studentEmail)
      }

      // Check for existing customers with any of these emails
      for (const email of emailsToCheck) {
        if (stripeCustomerId) break // Skip if we already found a customer

        console.log(
          `📧 [CREATE-CHECKOUT] Checking for Stripe customer with email: ${email}`
        )

        try {
          const existingCustomers = await stripeServerClient.customers.list({
            email: email,
            limit: 5, // Check more than one in case there are duplicates
          })

          if (existingCustomers.data.length > 0) {
            // Log all found customers for debugging
            existingCustomers.data.forEach((customer, index) => {
              console.log(
                `📝 [CREATE-CHECKOUT] Found Stripe customer ${index + 1}: ID=${customer.id}, Created=${new Date(customer.created * 1000).toISOString()}`
              )
            })

            // Use the most recently created customer
            const mostRecentCustomer = existingCustomers.data.sort(
              (a, b) => b.created - a.created
            )[0]
            stripeCustomerId = mostRecentCustomer.id

            console.log(
              `✅ [CREATE-CHECKOUT] Using most recent Stripe customer: ${stripeCustomerId}`
            )

            // Check if this customer has any subscriptions
            const subscriptions = await stripeServerClient.subscriptions.list({
              customer: stripeCustomerId,
              limit: 5,
            })

            if (subscriptions.data.length > 0) {
              console.log(
                `⚠️ [CREATE-CHECKOUT] Customer has ${subscriptions.data.length} subscriptions in Stripe`
              )

              // Log the subscription details for debugging
              subscriptions.data.forEach((sub, index) => {
                console.log(
                  `📝 [CREATE-CHECKOUT] Existing subscription ${index + 1}: ID=${sub.id}, Status=${sub.status}, Created=${new Date(sub.created * 1000).toISOString()}`
                )
              })
            } else {
              console.log(
                `✅ [CREATE-CHECKOUT] Customer has no subscriptions in Stripe`
              )
            }
          }
        } catch (error) {
          console.error(
            `❌ [CREATE-CHECKOUT] Error checking for existing customers with email ${email}:`,
            error
          )
          // Continue despite the error
        }
      }

      // If we still don't have a customer ID, check for payers in our database with these emails
      if (!stripeCustomerId && !existingPayer) {
        for (const email of emailsToCheck) {
          if (existingPayer) break // Skip if we already found a payer

          console.log(
            `🔍 [CREATE-CHECKOUT] Checking for payer in database with email: ${email}`
          )

          try {
            const payer = await prisma.payer.findUnique({
              where: { email: email },
            })

            if (payer) {
              console.log(
                `✅ [CREATE-CHECKOUT] Found payer in database: ${payer.id}`
              )

              existingPayer = payer

              if (payer.stripeCustomerId) {
                stripeCustomerId = payer.stripeCustomerId
                console.log(
                  `✅ [CREATE-CHECKOUT] Using payer's Stripe customer ID: ${stripeCustomerId}`
                )

                // Verify this customer still exists in Stripe
                try {
                  const _customer =
                    await stripeServerClient.customers.retrieve(
                      stripeCustomerId
                    )
                  console.log(
                    `✅ [CREATE-CHECKOUT] Verified Stripe customer exists: ${stripeCustomerId}`
                  )
                } catch (error) {
                  console.log(error)
                  console.error(
                    `❌ [CREATE-CHECKOUT] Stripe customer ID ${stripeCustomerId} is invalid or deleted`
                  )
                  stripeCustomerId = undefined // Reset if customer doesn't exist
                }
              }
            }
          } catch (error) {
            console.error(
              `❌ [CREATE-CHECKOUT] Error checking for payer with email ${email}:`,
              error
            )
            // Continue despite the error
          }
        }
      }
    }

    // Now proceed with the original logic, but with our enhanced checks
    // First check if we have a payer email from the request
    if (payerEmail && !stripeCustomerId) {
      console.log(
        `📧 [CREATE-CHECKOUT] Creating new Stripe customer with payer email: ${payerEmail}`
      )

      // Create a new customer in Stripe
      const newCustomer = await stripeServerClient.customers.create({
        email: payerEmail,
        name: payerName || undefined,
        phone: payerPhone || undefined,
        metadata: {
          studentIds: JSON.stringify(students.map((s) => s.id)),
          studentNames: students.map((s) => s.name).join(', '),
          source: 'pre_create_checkout',
          createdAt: new Date().toISOString(),
        },
      })
      stripeCustomerId = newCustomer.id
      console.log(
        `✅ [CREATE-CHECKOUT] Created new Stripe customer: ${stripeCustomerId}`
      )

      // Handle payer creation/update in database
      if (!existingPayer) {
        // Create a new payer
        console.log(
          `🔄 [CREATE-CHECKOUT] Creating new payer with email: ${payerEmail}`
        )
        existingPayer = await prisma.payer.create({
          data: {
            email: payerEmail,
            name: payerName || 'Unknown',
            phone: payerPhone || '',
            stripeCustomerId,
            relationship: 'Parent',
            students: {
              connect: students.map((s) => ({ id: s.id })),
            },
          },
        })
        console.log(
          `✅ [CREATE-CHECKOUT] Created new payer: ${existingPayer.id}`
        )
      } else if (!existingPayer.stripeCustomerId) {
        // Update the existing payer with the Stripe customer ID
        console.log(
          `🔄 [CREATE-CHECKOUT] Updating existing payer with Stripe customer ID: ${stripeCustomerId}`
        )
        await prisma.payer.update({
          where: { id: existingPayer.id },
          data: {
            stripeCustomerId,
            // Connect any students that aren't already connected
            students: {
              connect: students.map((s) => ({ id: s.id })),
            },
          },
        })
      }
    }
    // If no payer email provided but student has email, use that
    else if (studentEmail && !stripeCustomerId) {
      console.log(
        `📧 [CREATE-CHECKOUT] Creating new Stripe customer with student email: ${studentEmail}`
      )

      // Create a new customer in Stripe using student information
      const newCustomer = await stripeServerClient.customers.create({
        email: studentEmail,
        name: studentName,
        metadata: {
          studentIds: JSON.stringify(students.map((s) => s.id)),
          studentNames: students.map((s) => s.name).join(', '),
          source: 'pre_create_checkout_student_info',
          createdAt: new Date().toISOString(),
        },
      })
      stripeCustomerId = newCustomer.id
      console.log(
        `✅ [CREATE-CHECKOUT] Created new Stripe customer from student info: ${stripeCustomerId}`
      )

      // Handle payer creation/update in database
      if (!existingPayer) {
        // Create a new payer using student information
        console.log(
          `🔄 [CREATE-CHECKOUT] Creating new payer with student email: ${studentEmail}`
        )
        existingPayer = await prisma.payer.create({
          data: {
            email: studentEmail,
            name: studentName,
            phone: '', // No phone available from student
            stripeCustomerId,
            relationship: 'Self', // Assuming student is paying for themselves
            students: {
              connect: students.map((s) => ({ id: s.id })),
            },
          },
        })
        console.log(
          `✅ [CREATE-CHECKOUT] Created new payer from student info: ${existingPayer.id}`
        )
      } else if (!existingPayer.stripeCustomerId) {
        // Update the existing payer with the Stripe customer ID
        console.log(
          `🔄 [CREATE-CHECKOUT] Updating existing payer with Stripe customer ID: ${stripeCustomerId}`
        )
        await prisma.payer.update({
          where: { id: existingPayer.id },
          data: { stripeCustomerId },
        })
      }
    }

    // Connect the student to the payer if needed
    if (existingPayer) {
      // Check if all selected students are connected to this payer
      const studentsToConnect = []
      for (const student of selectedStudents) {
        if (student.payerId !== existingPayer.id) {
          studentsToConnect.push({ id: student.id })
        }
      }

      if (studentsToConnect.length > 0) {
        console.log(
          `🔄 [CREATE-CHECKOUT] Connecting ${studentsToConnect.length} students to payer: ${existingPayer.id}`
        )
        await prisma.payer.update({
          where: { id: existingPayer.id },
          data: {
            students: {
              connect: studentsToConnect,
            },
          },
        })
      }
    }

    // Get the existing product ID from environment variables
    const productId = process.env.STRIPE_PRODUCT_ID

    if (!productId) {
      console.error(
        '❌ [CREATE-CHECKOUT] STRIPE_PRODUCT_ID is not defined in environment variables'
      )
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    console.log(`🔑 [CREATE-CHECKOUT] Using product ID: ${productId}`)

    // Create a recurring price for the product
    console.log(
      `💰 [CREATE-CHECKOUT] Creating price with amount: ${amount} cents (${amount / 100} USD)`
    )
    const price = await stripeServerClient.prices.create({
      product: productId,
      unit_amount: amount, // Amount in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
      metadata: {
        studentIds: JSON.stringify(students.map((s) => s.id)),
        studentNames: students.map((s) => s.name).join(', '),
        totalMonthlyRate: amount / 100, // Convert back to dollars for readability
      },
    })

    console.log(
      `✅ [CREATE-CHECKOUT] Created price: ${price.id} for ${amount / 100} USD monthly`
    )

    // Get base URL for redirect
    const headersList = headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

    console.log(`🔗 [CREATE-CHECKOUT] Using base URL for redirect: ${baseUrl}`)

    // Check if all students belong to the same sibling group
    const siblingGroupIds = selectedStudents
      .map((s) => s.siblingGroupId)
      .filter(Boolean)

    const uniqueSiblingGroups = Array.from(new Set(siblingGroupIds))
    let siblingGroupId = undefined

    if (uniqueSiblingGroups.length === 1 && uniqueSiblingGroups[0]) {
      // All students belong to the same sibling group
      console.log(
        `👨‍👩‍👧‍👦 [CREATE-CHECKOUT] All students belong to sibling group: ${uniqueSiblingGroups[0]}`
      )
      siblingGroupId = uniqueSiblingGroups[0]
    }

    // Prepare checkout session parameters
    const sessionParams: any = {
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/payment-success?studentId=${primaryStudentId}`,
      cancel_url: `${baseUrl}/payment-link`,
      metadata: {
        studentIds: JSON.stringify(students.map((s) => s.id)),
        studentNames: students.map((s) => s.name).join(', '),
        studentRates: JSON.stringify(students.map((s) => s.monthlyRate)),
        paymentType: 'subscription',
        createdAt: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: '1.0.0',
      },
      subscription_data: {
        metadata: {
          studentIds: JSON.stringify(students.map((s) => s.id)),
          studentNames: students.map((s) => s.name).join(', '),
          studentRates: JSON.stringify(students.map((s) => s.monthlyRate)),
          totalMonthlyRate: amount / 100, // Convert back to dollars for readability
          createdAt: new Date().toISOString(),
          source: 'checkout_session',
          environment: process.env.NODE_ENV,
        },
        description:
          students.length === 1
            ? `Monthly tuition for ${students[0].name}`
            : `Monthly tuition for ${students.length} students`,
      },
    }

    // Add sibling group ID to metadata if applicable
    if (siblingGroupId) {
      sessionParams.metadata.siblingGroupId = siblingGroupId
      sessionParams.subscription_data.metadata.siblingGroupId = siblingGroupId
    }

    // Add customer ID if we have one
    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId
    } else if (payerEmail) {
      // If we don't have a customer ID but we have a payer email, set the customer_email
      sessionParams.customer_email = payerEmail
    } else if (studentEmail) {
      // If we don't have a customer ID but we have a student email, set the customer_email
      sessionParams.customer_email = studentEmail
    }

    console.log(
      '📝 [CREATE-CHECKOUT] Creating checkout session with params:',
      JSON.stringify(
        {
          ...sessionParams,
          line_items: sessionParams.line_items,
          metadata: {
            ...sessionParams.metadata,
            studentIds: JSON.parse(sessionParams.metadata.studentIds),
          },
          subscription_data: {
            ...sessionParams.subscription_data,
            metadata: {
              ...sessionParams.subscription_data.metadata,
              studentIds: JSON.parse(
                sessionParams.subscription_data.metadata.studentIds
              ),
              studentRates: JSON.parse(
                sessionParams.subscription_data.metadata.studentRates
              ),
            },
          },
        },
        null,
        2
      )
    )

    // Create a checkout session in Stripe
    const session =
      await stripeServerClient.checkout.sessions.create(sessionParams)

    console.log(
      `🎉 [CREATE-CHECKOUT] Successfully created checkout session: ${session.id}`
    )
    console.log(`🔗 [CREATE-CHECKOUT] Checkout URL: ${session.url}`)

    // Return the checkout session URL
    return NextResponse.json({
      success: true,
      url: session.url,
      id: session.id,
    })
  } catch (error) {
    console.error(
      '❌ [CREATE-CHECKOUT] Error creating checkout session:',
      error
    )
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    )
  }
}
