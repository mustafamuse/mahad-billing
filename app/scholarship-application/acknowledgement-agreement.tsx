'use client'

import { useFormContext } from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export default function AcknowledgementAgreement() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext()

  const termsAgreed = watch('termsAgreed')

  return (
    <div className="space-y-8">
      <div className="rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-semibold">Terms and Conditions</h3>

        <div className="space-y-4 text-sm">
          <p>By submitting this application, I acknowledge and agree that:</p>

          <ul className="ml-6 list-disc space-y-2">
            <li>
              All information provided in this application is true and accurate
              to the best of my knowledge.
            </li>
            <li>
              I understand that providing false information may result in the
              denial or revocation of the scholarship.
            </li>
            <li>
              I will maintain satisfactory academic progress and attendance as
              required by the program.
            </li>
            <li>
              I will promptly notify the administration of any changes in my
              financial or academic situation.
            </li>
            <li>
              I understand that the scholarship award is subject to available
              funding and meeting eligibility requirements.
            </li>
            <li>
              I agree to provide any additional documentation requested to
              verify my financial need.
            </li>
          </ul>

          <div className="mt-6 flex items-start space-x-2">
            <Checkbox
              id="termsAgreed"
              checked={termsAgreed}
              onCheckedChange={(checked) => {
                setValue('termsAgreed', checked === true)
              }}
              className={cn(errors.termsAgreed && 'border-red-500')}
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor="termsAgreed"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the terms and conditions{' '}
                <span className="text-red-500">*</span>
              </Label>
              {errors.termsAgreed && (
                <p className="text-sm text-red-500">
                  {errors.termsAgreed.message as string}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          <strong>Important Note:</strong> Please review all information before
          submitting. Once submitted, you cannot edit your application.
        </p>
      </div>
    </div>
  )
}
