import { Student, Batch, StudentPayment } from '@prisma/client'

export type SearchParams = {
  [key: string]: string | string[] | undefined
}

export interface NavItem {
  title: string
  href?: string
  disabled?: boolean
  external?: boolean
  icon?: string
  label?: string
  description?: string
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[]
}

export interface MainNavItem extends NavItem {}

export interface SidebarNavItem extends NavItemWithChildren {}

export type StudentWithDetails = Student & {
  batch: Batch | null
  StudentPayment: StudentPayment[]
  subscriptionMembers?: Array<{
    id: string
    name: string
  }>
}
