'use client'

import { useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { AuthModal } from '@/app/admin/dashboard/auth-modal'
import { useModal } from '@/hooks/use-modal'

export default function AdminAccessPage() {
  const router = useRouter()
  const { isOpen, onClose } = useModal(true)

  // Redirect to home if modal is closed
  useEffect(() => {
    if (!isOpen) {
      router.push('/')
    }
  }, [isOpen, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <AuthModal open={isOpen} onOpenChange={onClose} />
    </div>
  )
}
