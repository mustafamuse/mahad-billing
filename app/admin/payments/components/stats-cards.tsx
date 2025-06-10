import {
  Users,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  DollarSign,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/db'

async function getStats() {
  const [
    totalStudents,
    activeSubscriptions,
    pastDue,
    totalRevenue,
    enrolledStudents,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({
      where: { subscriptionStatus: 'active' },
    }),
    prisma.student.count({
      where: { status: 'past_due' },
    }),
    prisma.studentPayment.aggregate({
      _sum: { amountPaid: true },
    }),
    prisma.student.count({
      where: { status: 'enrolled' },
    }),
  ])

  return {
    totalStudents,
    activeSubscriptions,
    pastDue,
    totalRevenue: totalRevenue._sum.amountPaid || 0,
    enrolledStudents,
  }
}

export async function StatsCards() {
  const {
    totalStudents,
    activeSubscriptions,
    pastDue,
    totalRevenue,
    enrolledStudents,
  } = await getStats()

  const enrollmentRate =
    totalStudents > 0 ? (enrolledStudents / totalStudents) * 100 : 0
  const activeRate =
    totalStudents > 0 ? (activeSubscriptions / totalStudents) * 100 : 0

  const stats = [
    {
      title: 'Total Students',
      value: totalStudents,
      icon: Users,
      description: `${enrolledStudents} enrolled`,
      change: `${enrollmentRate.toFixed(1)}% enrollment rate`,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      bottomBorder: 'bg-blue-500/20 dark:bg-blue-400/20',
    },
    {
      title: 'Active Subscriptions',
      value: activeSubscriptions,
      icon: CreditCard,
      description: `${activeRate.toFixed(1)}% of students`,
      change: 'Billing status: Active',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      bottomBorder: 'bg-green-500/20 dark:bg-green-400/20',
    },
    {
      title: 'Past Due',
      value: pastDue,
      icon: AlertTriangle,
      description: pastDue > 0 ? 'Requires attention' : 'All up to date',
      change: pastDue > 0 ? 'Action needed' : 'Great job!',
      iconBg: pastDue > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted',
      iconColor:
        pastDue > 0
          ? 'text-red-600 dark:text-red-400'
          : 'text-muted-foreground',
      bottomBorder:
        pastDue > 0 ? 'bg-red-500/20 dark:bg-red-400/20' : 'bg-muted/20',
    },
    {
      title: 'Total Revenue',
      value: `$${(totalRevenue / 100).toLocaleString()}`,
      icon: DollarSign,
      description: 'All-time earnings',
      change: 'Cumulative payments',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      bottomBorder: 'bg-purple-500/20 dark:bg-purple-400/20',
    },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="relative overflow-hidden border-border bg-card"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`rounded-md p-2 ${stat.iconBg}`}>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {stat.value}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stat.description}
            </p>
            <div className="mt-2 flex items-center">
              <TrendingUp className="mr-1 h-3 w-3 text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-600 dark:text-green-400">
                {stat.change}
              </span>
            </div>
          </CardContent>
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 ${stat.bottomBorder}`}
          />
        </Card>
      ))}
    </div>
  )
}
