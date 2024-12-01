import { GraduationCap } from 'lucide-react'

import { BaseHeader } from './base-header'

export function Header() {
  return (
    <BaseHeader
      title="Set Up Your Tuition Payment"
      description="Welcome to Irshād Mahad's tuition payment portal. Use this app to set up your monthly tuition payments easily and securely. Simply select your name and complete the payment process."
      icon={GraduationCap}
      layout="centered"
    />
  )
}
