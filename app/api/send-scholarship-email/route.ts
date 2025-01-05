import { NextResponse } from 'next/server'

import { Resend } from 'resend'

// Add edge runtime for better performance on Vercel
export const runtime = 'edge'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { pdfBlob, studentName, email } = await req.json()

    if (!process.env.RESEND_API_KEY) {
      throw new Error('Missing Resend API key')
    }

    if (!pdfBlob) {
      throw new Error('PDF content is missing')
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBlob.split(',')[1], 'base64')

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [process.env.ADMIN_EMAIL || 'umpp101@gmail.com', email],
      subject: `Mahad Scholarship Application - ${studentName}`,
      text: `${studentName} has submitted their Mahad scholarship application.`,
      attachments: [
        {
          filename: `mahad-scholarship-application-${studentName.toLowerCase().replace(/\s+/g, '-')}.pdf`,
          content: pdfBuffer,
        },
      ],
    })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Email sending failed:', {
      error,
      message: (error as Error)?.message,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send email',
        details: (error as Error)?.message,
      },
      { status: 500 }
    )
  }
}
