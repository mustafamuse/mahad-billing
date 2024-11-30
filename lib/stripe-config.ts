import { Appearance } from '@stripe/stripe-js'

export const stripeAppearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#0F172A',
    fontFamily: 'Inter var, sans-serif',
    borderRadius: '0.5rem',
    fontWeightNormal: '400',
    fontWeightBold: '600',
    colorBackground: '#fff',
    colorText: '#0F172A',
    colorDanger: '#ef4444',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      border: '1px solid #e2e8f0',
      boxShadow: 'none',
    },
    '.Input:focus': {
      border: '2px solid #0F172A',
      boxShadow: 'none',
    },
    '.Label': {
      fontWeight: '500',
      color: '#475569',
    },
    '.Error': {
      color: '#ef4444',
    },
  },
}
