import { toast } from './index'

interface ApiErrorOptions {
  title?: string
  error: Error | unknown
  duration?: number
}

export const toasts = {
  apiError: ({ title = 'Error', error, duration = 5000 }: ApiErrorOptions) => {
    return toast.error(title, {
      description:
        error instanceof Error ? error.message : 'An unexpected error occurred',
      duration,
    })
  },

  success: (title: string, description?: string) => {
    return toast.success(title, {
      description,
      duration: 4000,
    })
  },

  promise: async <T>(
    promise: Promise<T>,
    {
      loading = 'Loading...',
      success = 'Success!',
      error = 'Something went wrong',
    }: {
      loading?: string
      success?: string
      error?: string
    } = {}
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    })
  },

  processingPayment: () => {
    return toast.loading('Processing Payment', {
      description: 'Please wait while we process your payment...',
    })
  },

  formSubmission: {
    start: () => toast.loading('Submitting...'),
    success: () => toast.success('Submitted Successfully'),
    error: (error: Error) =>
      toasts.apiError({ error, title: 'Submission Failed' }),
  },
}
