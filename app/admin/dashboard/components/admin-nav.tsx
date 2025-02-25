'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const navItems = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
  },
  {
    title: 'Duplicate Students',
    href: '/admin/duplicate-students',
  },
  {
    title: 'Student Payers',
    href: '/admin/student-payers',
  },
  {
    title: 'Sibling Groups',
    href: '/admin/sibling-groups',
  },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="mb-8 flex items-center space-x-4 lg:space-x-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            pathname === item.href ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}
