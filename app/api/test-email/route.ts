import { NextResponse } from 'next/server'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  try {
    console.log('Testing Resend connection...')
    console.log('API Key exists:', !!process.env.RESEND_API_KEY)

    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ['umpp101@gmail.com'],
      subject: 'Test Email',
      text: 'This is a test email to verify Resend is working.',
    })

    console.log('Test email result:', result)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Test email failed:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
