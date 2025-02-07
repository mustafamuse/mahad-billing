import { PayorDetails } from '../types'

export interface PayorDetailsFormData extends PayorDetails {
  termsAccepted: boolean
}

export interface EnrollmentFormData {
  students: string[]
  payorDetails: PayorDetails
  termsAccepted: boolean
}
