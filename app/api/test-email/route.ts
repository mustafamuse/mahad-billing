import { NextResponse } from 'next/server'

import { Resend } from 'resend'

export const runtime = 'edge'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Resend API key not configured' },
        { status: 500 }
      )
    }

    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: process.env.ADMIN_EMAIL || 'umpp101@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email to verify Resend configuration',
    })

    return NextResponse.json({
      message: 'Test email sent successfully',
      data,
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}
