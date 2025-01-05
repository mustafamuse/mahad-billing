import { NextResponse } from 'next/server'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    console.log('Received email request')
    const { pdfBlob, studentName, email } = await req.json()
    console.log('Request data:', {
      studentName,
      email,
      pdfBlobLength: pdfBlob?.length,
      hasContent: !!pdfBlob,
    })

    if (!pdfBlob) {
      throw new Error('PDF content is missing')
    }

    // Convert base64 to buffer
    console.log('Converting base64 to buffer...')
    const pdfBuffer = Buffer.from(pdfBlob.split(',')[1], 'base64')
    console.log('Buffer created:', {
      bufferLength: pdfBuffer.length,
      isValidBuffer: Buffer.isBuffer(pdfBuffer),
    })

    console.log('Sending email to:', {
      adminEmail: 'umpp101@gmail.com',
      applicantEmail: email,
    })

    console.log('Sending email via Resend...')
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ['umpp101@gmail.com', email],
      subject: `Mahad Scholarship Application - ${studentName}`,
      text: `${studentName} has submitted their Mahad scholarship application.`,
      attachments: [
        {
          filename: `mahad-scholarship-application-${studentName.toLowerCase().replace(/\s+/g, '-')}.pdf`,
          content: pdfBuffer,
        },
      ],
    })

    console.log('Email sent to both addresses:', result)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Email sending failed:', {
      error,
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send email',
        details: error.message,
        name: error.name,
      },
      { status: 500 }
    )
  }
}
