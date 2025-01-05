import { toast } from 'sonner'

export const toasts = {
  success: (title: string, description?: string) => {
    console.log('Success Toast:', { title, description })
    toast.success(title, {
      description,
    })
  },
  error: (title: string, description?: string) => {
    console.log('Error Toast:', { title, description })
    toast.error(title, {
      description,
    })
  },
}
