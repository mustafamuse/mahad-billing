'use client'

import { useState } from 'react'

import { toast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ADMIN_PASSWORD } from '@/lib/constants'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('Form submitted with password:', password)
    setError('')
    setIsLoading(true)

    if (password === ADMIN_PASSWORD) {
      console.log('Password correct, navigating...')
      // Close modal and reset state before navigation
      setPassword('')
      setIsLoading(false)
      onOpenChange(false)

      // Use window.location for a hard navigation
      window.location.href = '/admin/dashboard'
      return
    }

    console.log('Password incorrect')
    setError('Invalid password')
    toast.error('Access Denied', {
      description: 'Invalid password. Please try again.',
    })
    setIsLoading(false)
    setPassword('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Admin Authentication</DialogTitle>
          <DialogDescription>
            Enter your admin password to access the dashboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !password}
          >
            {isLoading ? 'Verifying...' : 'Access Dashboard'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
