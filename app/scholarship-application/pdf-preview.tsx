'use client'

import { useEffect, useCallback } from 'react'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  usePDF,
} from '@react-pdf/renderer'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface ScholarshipPDFProps {
  data: {
    'Applicant Details': {
      studentName: string
      className: string
      email: string
      phone: string
      payer: string
      payerRelation?: string
      payerName?: string
      siblingCount?: number
      monthlyRate?: number
    }
    'Financial Assessment': {
      educationStatus: string
      schoolName?: string
      schoolYear?: string
      collegeName?: string
      collegeYear?: string
      qualifiesForFafsa?: string
      fafsaExplanation?: string
      householdSize: string
      dependents: string
      adultsInHousehold: string
      livesWithBothParents: string
      livingExplanation?: string
      isEmployed: string
      monthlyIncome?: number
    }
    'Scholarship Justification': {
      needJustification: string
      goalSupport: string
      commitment: string
      additionalInfo?: string
    }
    'Terms Agreement': {
      termsAgreed: boolean
    }
  }
}

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: '48 72', // Reduced top/bottom padding
    fontSize: 11, // Slightly smaller font
    fontFamily: 'Times-Roman',
    lineHeight: 1.4, // Reduced line height
  },
  header: {
    marginBottom: 24, // Reduced margin
  },
  date: {
    textAlign: 'right',
    fontSize: 11,
    marginBottom: 24, // Reduced margin
    fontFamily: 'Times-Roman',
  },
  salutation: {
    marginBottom: 16, // Reduced margin
    fontSize: 11,
    fontFamily: 'Times-Roman',
  },
  paragraph: {
    marginBottom: 12, // Reduced margin between paragraphs
    textAlign: 'justify',
    fontSize: 11,
    fontFamily: 'Times-Roman',
    lineHeight: 1.4,
  },
  signatureBlock: {
    marginTop: 16, // Reduced margin
  },
  sincerely: {
    marginBottom: 24,
    fontSize: 11,
    fontFamily: 'Times-Roman',
  },
  signatureName: {
    fontSize: 11,
    fontFamily: 'Times-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 72,
    right: 72,
    textAlign: 'center',
    fontSize: 8,
    color: '#666666',
    borderTop: '1 solid #cccccc',
    paddingTop: 8,
  },
})

export default function ScholarshipPDF({ data }: ScholarshipPDFProps) {
  console.log('ScholarshipPDF component rendered with data:', {
    studentName: data['Applicant Details'].studentName,
    email: data['Applicant Details'].email,
  })

  const {
    studentName,
    className,
    email,
    phone,
    payer,
    payerRelation,
    payerName,
    siblingCount = 0,
    monthlyRate = 0,
  } = data['Applicant Details']

  const {
    educationStatus,
    schoolName,
    schoolYear,
    collegeName,
    collegeYear,
    qualifiesForFafsa,
    fafsaExplanation,
    householdSize,
    dependents,
    adultsInHousehold,
    livesWithBothParents,
    livingExplanation,
    isEmployed,
    monthlyIncome,
  } = data['Financial Assessment']

  const { needJustification, goalSupport, commitment, additionalInfo } =
    data['Scholarship Justification']

  const { termsAgreed } = data['Terms Agreement']

  const dateStr = format(new Date(), 'MMMM dd, yyyy')

  // Format currency helper
  const formatCurrency = (amount?: number) => {
    if (!amount) return ''
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Update narrative strings to handle optional fields
  const siblingInfo = siblingCount
    ? `I have ${siblingCount} sibling${siblingCount > 1 ? 's' : ''}${
        monthlyRate
          ? ` and my monthly tuition rate is ${formatCurrency(monthlyRate)}`
          : ''
      }.`
    : monthlyRate
      ? `My monthly tuition rate is ${formatCurrency(monthlyRate)}.`
      : ''

  const parentsInfo =
    livesWithBothParents === 'yes'
      ? 'I currently live with both of my parents'
      : `I do not live with both of my parents${livingExplanation ? `. ${livingExplanation}` : ''}`

  const employmentInfo =
    isEmployed === 'yes'
      ? `I am currently employed${
          monthlyIncome
            ? ` with a monthly income of ${formatCurrency(monthlyIncome)}`
            : ''
        }, which adds to the scheduling and financial considerations of my studies.`
      : 'I am not currently employed, so tuition costs are a primary concern.'

  const payerInfo =
    payer === 'relative'
      ? `My ${payerRelation} (${payerName}) is responsible for my tuition payments.`
      : 'I am personally responsible for my tuition payments.'

  const educationDetails = (() => {
    if (!educationStatus) return 'My education status is pending.'

    if (educationStatus === 'highschool' && schoolName && schoolYear) {
      return `I am a ${schoolYear} student at ${schoolName}.`
    }
    if (educationStatus === 'college' && collegeName && collegeYear) {
      return `I am a ${collegeYear} student at ${collegeName}${
        qualifiesForFafsa === 'no' && fafsaExplanation
          ? ` (${fafsaExplanation})`
          : ''
      }.`
    }
    return `My current education status is: ${educationStatus.replace(/-/g, ' ')}.`
  })()

  // Format multiline text helper
  const formatMultilineText = (text: string) => {
    return text.replace(/\n/g, ' ').trim()
  }

  const termsAgreementStr = termsAgreed
    ? 'I have reviewed and agreed to all terms and conditions related to this scholarship.'
    : 'I am prepared to review and accept all terms and conditions upon approval.'

  const MyDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.date}>{dateStr}</Text>
        </View>

        <Text style={styles.salutation}>Dear Mahad,</Text>

        <Text style={styles.paragraph}>
          My name is {studentName}, and I am applying for the financial
          scholarship program. I am enrolled in the {className} class and seek
          to further my islamic education.
        </Text>

        <Text style={styles.paragraph}>
          {educationDetails} I live in a household of {householdSize}, where{' '}
          {parentsInfo}. Our family has {dependents} dependent(s) and{' '}
          {adultsInHousehold} adult(s).
          {employmentInfo}
        </Text>

        <Text style={styles.paragraph}>
          {payerInfo} {siblingInfo}
        </Text>

        <Text style={styles.paragraph}>
          My current financial situation is as follows:{' '}
          {formatMultilineText(needJustification)}
          {goalSupport
            ? ` This scholarship would help by ${formatMultilineText(goalSupport)}.`
            : ''}
          {commitment ? ` ${formatMultilineText(commitment)}` : ''}
          {additionalInfo ? `\n\n${formatMultilineText(additionalInfo)}` : ''}
        </Text>

        <Text style={styles.paragraph}>
          {termsAgreementStr} I promise to uphold the highest standards of
          academic integrity and to represent the program with honor.
        </Text>

        <Text style={styles.paragraph}>
          Thank you for considering my application. I am excited about the
          possibility of joining your scholarship program and would appreciate
          the opportunity to discuss how this scholarship aligns with my
          educational and career objectives. I can be reached at {email} or{' '}
          {phone}
          for any additional questions or clarifications.
        </Text>

        <Text style={styles.paragraph}>
          I look forward to hearing from you and thank you for your time and
          consideration.
        </Text>

        <View style={styles.signatureBlock}>
          <Text style={styles.sincerely}>Sincerely,</Text>
          <Text style={styles.signatureName}>{studentName}</Text>
        </View>

        <Text style={styles.footer}>
          This document is confidential and should be handled according to
          institutional privacy policies.
        </Text>
      </Page>
    </Document>
  )

  // Use usePDF hook to generate PDF
  console.log('Initializing usePDF hook')
  const [instance] = usePDF({ document: MyDocument })

  // Memoize sendEmailWithPDF to fix useEffect dependency
  const sendEmailWithPDF = useCallback(
    async (blob: Blob) => {
      console.log('Starting email process', {
        blobSize: blob.size,
        blobType: blob.type,
        timestamp: new Date().toISOString(),
      })

      try {
        // Convert blob to base64
        console.log('Converting blob to base64')
        const base64data = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            console.log('Base64 conversion complete', {
              resultLength: reader.result?.toString().length,
            })
            resolve(reader.result)
          }
          reader.onerror = (error) => {
            console.error('Base64 conversion failed:', error)
          }
          reader.readAsDataURL(blob)
        })

        console.log('Preparing API request', {
          hasBase64: !!base64data,
          studentName: data['Applicant Details'].studentName,
          email: data['Applicant Details'].email,
        })

        console.log('Sending request to email API')
        const emailResponse = await fetch('/api/send-scholarship-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdfBlob: base64data,
            studentName: data['Applicant Details'].studentName,
            email: data['Applicant Details'].email,
          }),
        })

        const responseData = await emailResponse.json()
        console.log('Email API response received:', responseData)

        if (emailResponse.ok) {
          console.log('Email sent successfully', {
            status: emailResponse.status,
            responseData,
          })
          toast.success('Email Sent', {
            description: 'Application has been emailed to the Mahad Office',
          })
        } else {
          console.error('Email API error:', {
            status: emailResponse.status,
            responseData,
            statusText: emailResponse.statusText,
          })
          toast.error('Email Failed', {
            description: 'Could not send email to Mahad Office',
          })
        }
      } catch (error) {
        console.error('Email process failed:', {
          error,
          message: error.message,
          stack: error.stack,
          type: error.name,
        })
        toast.error('Email Failed', {
          description: `Could not send email: ${error.message}`,
        })
      }
    },
    [data]
  )

  // Handle PDF generation and email sending
  useEffect(() => {
    console.log('PDF generation effect triggered', {
      hasBlob: !!instance.blob,
      hasUrl: !!instance.url,
      loading: instance.loading,
      error: instance.error,
    })

    if (instance.loading) {
      console.log('PDF is still generating...')
      return
    }

    if (instance.error) {
      console.error('PDF generation error:', instance.error)
      return
    }

    if (instance.blob) {
      console.log('PDF blob generated successfully', {
        blobSize: instance.blob.size,
        blobType: instance.blob.type,
      })

      // Send email
      console.log('Initiating email process with blob')
      sendEmailWithPDF(instance.blob)
        .then(() => console.log('Email process completed'))
        .catch((error) => console.error('Email process failed:', error))

      // Open PDF in new tab
      if (instance.url) {
        console.log('Attempting to open PDF in new tab:', {
          url: instance.url.substring(0, 50) + '...', // Log first 50 chars of URL
        })
        const printWindow = window.open(instance.url)
        if (printWindow) {
          console.log('Print window opened successfully')
          printWindow.print()
        } else {
          console.warn('Failed to open print window - popup might be blocked')
        }
      } else {
        console.warn('URL not available for PDF preview')
      }
    }
  }, [
    instance.blob,
    instance.url,
    instance.loading,
    instance.error,
    sendEmailWithPDF,
  ])

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h1 className="mb-8 text-2xl font-bold">
        Scholarship Application Letter
      </h1>

      <Button
        onClick={async () => {
          console.log('Manual test: Sending test email...')
          try {
            const response = await fetch('/api/test-email')
            const data = await response.json()
            console.log('Test email response:', data)
          } catch (error) {
            console.error('Test email failed:', error)
          }
        }}
        className="mb-4"
      >
        Test Email Connection
      </Button>

      {/* Hidden download link for generating PDF */}
      <div className="hidden">
        <PDFDownloadLink
          document={MyDocument}
          fileName={`scholarship-application-${data['Applicant Details'].studentName.toLowerCase().replace(/\s+/g, '-')}.pdf`}
        >
          {({ loading, error }) => {
            console.log('PDFDownloadLink state:', { loading, error })
            if (loading) {
              console.log('PDFDownloadLink is loading')
            }
            if (error) {
              console.error('PDFDownloadLink error:', error)
            }
            return null
          }}
        </PDFDownloadLink>
      </div>

      {/* Show loading state */}
      {instance.loading && (
        <div>
          {console.log('Showing loading state')}
          Generating your scholarship application...
        </div>
      )}

      {/* Show any errors */}
      {instance.error && (
        <div className="text-red-500">
          {console.error('Showing error state:', instance.error)}
          Error generating PDF: {instance.error.message}
        </div>
      )}
    </div>
  )
}
