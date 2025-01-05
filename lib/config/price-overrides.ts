interface PriceOverride {
  name: string
  monthlyRate: number
  reason?: string
}

export const PRICE_OVERRIDES: PriceOverride[] = [
  {
    name: 'Mustafa Muse',
    monthlyRate: 1,
    reason: 'Special rate',
  },
  // Add more overrides as needed
]

export function getOverriddenPrice(studentName: string): number | null {
  const override = PRICE_OVERRIDES.find(
    (o) => o.name.toLowerCase() === studentName.toLowerCase()
  )
  return override?.monthlyRate ?? null
}
