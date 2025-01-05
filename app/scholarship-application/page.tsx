'use client'

import { useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { FormProvider, useForm } from 'react-hook-form'

import { toasts } from '@/components/toast/toast-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import AcknowledgementAgreement from './acknowledgement-agreement'
import ApplicantDetails from './applicant-details'
import FinancialAssessment from './financial-assessment'
import {
  applicantDetailsSchema,
  financialAssessmentSchema,
  scholarshipJustificationSchema,
  acknowledgementSchema,
  ScholarshipApplicationData,
} from './schemas'
import ScholarshipJustification from './scholarship-justification'

const steps = [
  {
    title: 'Applicant Details',
    component: ApplicantDetails,
    schema: applicantDetailsSchema,
  },
  {
    title: 'Financial Assessment',
    component: FinancialAssessment,
    schema: financialAssessmentSchema,
  },
  {
    title: 'Scholarship Justification & Goals',
    component: ScholarshipJustification,
    schema: scholarshipJustificationSchema,
  },
  {
    title: 'Acknowledgement & Agreement',
    component: AcknowledgementAgreement,
    schema: acknowledgementSchema,
  },
]

export default function ScholarshipApplication() {
  const [currentStep, setCurrentStep] = useState(0)

  const methods = useForm<ScholarshipApplicationData>({
    mode: 'onChange',
    resolver: zodResolver(steps[currentStep].schema),
    defaultValues: {
      studentName: '',
      className: '',
      email: '',
      phone: '',
      siblingCount: 0,
      monthlyRate: 0,
      payer: undefined,
      payerRelation: '',
      payerName: '',
      payerPhone: '',
      educationStatus: undefined,
      schoolName: '',
      schoolYear: '',
      collegeName: '',
      collegeYear: '',
      qualifiesForFafsa: undefined,
      fafsaExplanation: '',
      householdSize: '',
      dependents: '',
      adultsInHousehold: '',
      livesWithBothParents: undefined,
      livingExplanation: '',
      isEmployed: undefined,
      monthlyIncome: null,
      financialSituation: '',
      termsAgreed: false,
    },
  })

  const {
    handleSubmit,
    trigger,
    formState: { errors },
  } = methods

  const handleNext = async () => {
    const currentStepFields = {
      0: [
        'studentName',
        'className',
        'email',
        'phone',
        'payer',
        'payerRelation',
        'payerName',
        'payerPhone',
      ],
      1: [
        'educationStatus',
        'schoolName',
        'schoolYear',
        'collegeName',
        'collegeYear',
        'qualifiesForFafsa',
        'fafsaExplanation',
        'householdSize',
        'dependents',
        'adultsInHousehold',
        'livesWithBothParents',
        'livingExplanation',
        'isEmployed',
        'monthlyIncome',
        'financialSituation',
      ],
      2: ['needJustification', 'goalSupport', 'commitment'],
      3: ['termsAgreed'],
    }[currentStep]

    const isStepValid = await trigger(currentStepFields)

    if (isStepValid) {
      const formData = methods.getValues()

      if (currentStep === 0) {
        console.log('Applicant Details Step Data:', {
          studentName: formData.studentName,
          className: formData.className,
          email: formData.email,
          phone: formData.phone,
          payer: formData.payer,
          payerRelation: formData.payerRelation,
          payerName: formData.payerName,
          payerPhone: formData.payerPhone,
          siblingCount: formData.siblingCount,
          monthlyRate: formData.monthlyRate,
        })
      } else if (currentStep === 1) {
        console.log('Financial Assessment Step Data:', {
          educationStatus: formData.educationStatus,
          schoolName: formData.schoolName,
          schoolYear: formData.schoolYear,
          collegeName: formData.collegeName,
          collegeYear: formData.collegeYear,
          qualifiesForFafsa: formData.qualifiesForFafsa,
          fafsaExplanation: formData.fafsaExplanation,
          householdSize: formData.householdSize,
          dependents: formData.dependents,
          adultsInHousehold: formData.adultsInHousehold,
          livesWithBothParents: formData.livesWithBothParents,
          livingExplanation: formData.livingExplanation,
          isEmployed: formData.isEmployed,
          monthlyIncome: formData.monthlyIncome,
          financialSituation: formData.financialSituation,
        })
      }

      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1)
      }
    } else {
      console.log(
        `Step ${currentStep + 1} Validation Errors:`,
        Object.keys(errors)
          .filter((key) => currentStepFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = errors[key]
            return obj
          }, {})
      )
    }
  }

  const onSubmit = async (_data: ScholarshipApplicationData) => {
    try {
      // Validate all steps in sequence
      const isApplicantDetailsValid = await trigger([
        'studentName',
        'className',
        'email',
        'phone',
        'payer',
        'payerRelation',
        'payerName',
        'payerPhone',
      ])

      const isFinancialAssessmentValid = await trigger([
        'educationStatus',
        'schoolName',
        'schoolYear',
        'collegeName',
        'collegeYear',
        'qualifiesForFafsa',
        'fafsaExplanation',
        'householdSize',
        'dependents',
        'adultsInHousehold',
        'livesWithBothParents',
        'livingExplanation',
        'isEmployed',
        'monthlyIncome',
        'financialSituation',
      ])

      const isJustificationValid = await trigger([
        'needJustification',
        'goalSupport',
        'commitment',
      ])

      const isAcknowledgementValid = await trigger(['termsAgreed'])

      if (
        !isApplicantDetailsValid ||
        !isFinancialAssessmentValid ||
        !isJustificationValid ||
        !isAcknowledgementValid
      ) {
        // If any step is invalid, go to that step
        if (!isApplicantDetailsValid) setCurrentStep(0)
        else if (!isFinancialAssessmentValid) setCurrentStep(1)
        else if (!isJustificationValid) setCurrentStep(2)
        return
      }

      // Get the complete form data
      const formData = methods.getValues()

      // If all steps are valid, log the data and show success message
      console.log('Final Form Submission:', {
        'Applicant Details': {
          studentName: formData.studentName,
          className: formData.className,
          email: formData.email,
          phone: formData.phone,
          payer: formData.payer,
          ...(formData.payer === 'relative' && {
            payerRelation: formData.payerRelation,
            payerName: formData.payerName,
            payerPhone: formData.payerPhone,
          }),
          siblingCount: formData.siblingCount,
          monthlyRate: formData.monthlyRate,
        },
        'Financial Assessment': {
          educationStatus: formData.educationStatus,
          ...(formData.educationStatus === 'highschool' && {
            schoolName: formData.schoolName,
            schoolYear: formData.schoolYear,
          }),
          ...(formData.educationStatus === 'college' && {
            collegeName: formData.collegeName,
            collegeYear: formData.collegeYear,
            qualifiesForFafsa: formData.qualifiesForFafsa,
            ...(formData.qualifiesForFafsa === 'no' && {
              fafsaExplanation: formData.fafsaExplanation,
            }),
          }),
          householdSize: formData.householdSize,
          dependents: formData.dependents,
          adultsInHousehold: formData.adultsInHousehold,
          livesWithBothParents: formData.livesWithBothParents,
          ...(formData.livesWithBothParents === 'no' && {
            livingExplanation: formData.livingExplanation,
          }),
          isEmployed: formData.isEmployed,
          ...(formData.isEmployed === 'yes' && {
            monthlyIncome: formData.monthlyIncome,
          }),
          financialSituation: formData.financialSituation,
        },
        'Scholarship Justification': {
          needJustification: formData.needJustification,
          goalSupport: formData.goalSupport,
          commitment: formData.commitment,
          ...(formData.additionalInfo && {
            additionalInfo: formData.additionalInfo,
          }),
        },
        'Terms Agreement': {
          termsAgreed: formData.termsAgreed,
        },
      })

      toasts.success(
        'Application Submitted Successfully',
        'We will review your application and get back to you soon.'
      )
    } catch (error: any) {
      console.error('Form validation failed:', error)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const CurrentStepComponent = steps[currentStep].component

  return (
    <FormProvider {...methods}>
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold">
              Financial Scholarship Assistance Application
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        index <= currentStep
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="mt-1 hidden text-center text-xs sm:block">
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300 ease-in-out"
                  style={{
                    width: `${((currentStep + 1) / steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <CurrentStepComponent />
              <div className="mt-8 flex justify-between">
                <Button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  variant="outline"
                  className="w-[120px]"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                {currentStep === steps.length - 1 ? (
                  <Button type="submit" className="w-[120px]">
                    Submit
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="w-[120px]"
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </FormProvider>
  )
}
