'use client'

import { useRouter } from 'next/navigation'

import { Lock } from 'lucide-react'

import { BankVerificationButton } from '@/components/bank-verification-button'
import { Button } from '@/components/ui/button'

interface FooterProps {
  showButtons?: boolean
}

export function Footer({ showButtons = false }: FooterProps) {
  const router = useRouter()

  return (
    <footer className="border-t py-6">
      <div className="container flex flex-col items-center justify-center gap-4">
        <p className="text-center text-sm leading-loose text-muted-foreground">
          {/* Built by <span className="font-medium">Mustafa Al-Azharī</span> */}
        </p>
        {showButtons && (
          <div className="flex gap-2">
            <BankVerificationButton />
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin-access')}
            >
              <Lock className="mr-2 h-4 w-4" />
              Admin Access
            </Button>
          </div>
        )}
      </div>
    </footer>
  )
}
