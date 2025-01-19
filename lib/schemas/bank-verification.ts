import { z } from 'zod'

export const bankMicroDepositSchema = z.object({
  setupId: z.string().min(1, 'Please select an enrollment'),
  amount1: z
    .string()
    .min(1, 'Please enter the first amount')
    .refine((val) => !isNaN(Number(val)), 'Must be a valid number')
    .refine((val) => Number(val) > 0, 'Amount must be greater than 0')
    .refine((val) => Number(val) < 1, 'Amount must be less than $1.00')
    .refine((val) => {
      const decimals = val.split('.')[1]
      return !decimals || decimals.length <= 2
    }, 'Maximum 2 decimal places allowed'),
  amount2: z
    .string()
    .min(1, 'Please enter the second amount')
    .refine((val) => !isNaN(Number(val)), 'Must be a valid number')
    .refine((val) => Number(val) > 0, 'Amount must be greater than 0')
    .refine((val) => Number(val) < 1, 'Amount must be less than $1.00')
    .refine((val) => {
      const decimals = val.split('.')[1]
      return !decimals || decimals.length <= 2
    }, 'Maximum 2 decimal places allowed'),
})

// Schema for API validation
export const bankMicroDepositApiSchema = z.object({
  setupId: z.string().min(1),
  amounts: z
    .array(z.number())
    .length(2, 'Exactly two amounts are required')
    .refine(
      (amounts) => amounts.every((amount) => amount > 0 && amount < 1),
      'Amounts must be greater than 0 and less than $1.00'
    )
    .refine(
      (amounts) => amounts[0] !== amounts[1],
      'Amounts cannot be the same'
    ),
})

export type BankMicroDepositValues = z.infer<typeof bankMicroDepositSchema>
export type BankMicroDepositApiValues = z.infer<
  typeof bankMicroDepositApiSchema
>
