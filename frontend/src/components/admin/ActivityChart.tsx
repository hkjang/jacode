"use client"

import { useMemo } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format, parseISO, startOfDay } from "date-fns"

interface ActivityChartProps {
  logs: any[]
}

export function ActivityChart({ logs }: ActivityChartProps) {
  const data = useMemo(() => {
    const activityMap = new Map<string, number>()
    
    // Group logs by day
    logs.forEach(log => {
      const day = format(parseISO(log.createdAt), 'yyyy-MM-dd')
      activityMap.set(day, (activityMap.get(day) || 0) + 1)
    })

    // Convert to array and sort by date
    return Array.from(activityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7) // Last 7 days with activity
  }, [logs])

  if (data.length === 0) return null

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Activity Overview</CardTitle>
        <CardDescription>
          Daily admin actions over the selected period.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <XAxis
              dataKey="date"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => format(parseISO(value), 'MMM dd')}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
             <Tooltip
                cursor={{ fill: 'transparent' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              {label ? format(parseISO(label), 'MMM dd, yyyy') : ''}
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {payload[0].value} actions
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
            <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
