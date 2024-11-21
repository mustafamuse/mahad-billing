export interface Student {
  id: string;
  name: string;
  monthlyRate: number;
  familyId?: string;
  totalFamilyMembers?: number;
}

export interface EnrollmentFormData {
  students: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  confirmAccountNumber: string;
  accountType: "checking" | "savings";
  termsAccepted: boolean;
}