'use client'

import { useEffect, useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function MonitoringPage() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch('/api/monitoring')
      const data = await res.json()
      setStats(data)
    }

    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Refresh every 5s
    return () => clearInterval(interval)
  }, [])

  if (!stats) return <div>Loading...</div>

  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-8 text-2xl font-bold">Rate Limit Monitoring</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Blocked Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">
              {stats.stats?.blocked || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last 24h</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.stats?.last24h || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Unique IPs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.stats?.uniqueIPs || 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
