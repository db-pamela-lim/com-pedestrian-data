import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
} from 'recharts'

// Sample time-series data for dashboard (replace with API when connected to Genie/warehouse)
function useSampleData() {
  return useMemo(() => {
    const locations = ['Lygon Street', 'Bourke St Mall', 'Swanston Street', 'Elizabeth Street'] as const
    const now = new Date()

    // Monthly trend: last 24 months
    const monthly: { month: string; count: number; location: string }[] = []
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
      const isPostCovid = i < 18
      const base = isPostCovid ? 42000 + (23 - i) * 800 : 38000 - (23 - i) * 200
      const noise = () => Math.round((Math.random() - 0.5) * 4000)
      locations.forEach((loc) => {
        monthly.push({
          month: monthStr,
          count: Math.max(5000, base + noise()),
          location: loc,
        })
      })
    }

    // Hour-of-day pattern (average foot traffic by hour)
    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      short: `${hour}h`,
      count: Math.round(
        (hour >= 7 && hour <= 9 ? 0.9 + (hour === 8 ? 0.5 : 0) : hour >= 12 && hour <= 14 ? 1.2 : hour >= 17 && hour <= 19 ? 1.1 : 0.3) *
          12000 +
          (Math.random() - 0.5) * 1500
      ),
    }))

    // Weekday vs weekend (last 24 weeks)
    const weekly: { week: string; weekday: number; weekend: number; weekIndex: number }[] = []
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const weekStr = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })}`
      weekly.push({
        week: weekStr,
        weekday: Math.round(95000 + (23 - i) * 200 + (Math.random() - 0.5) * 5000),
        weekend: Math.round(78000 + (23 - i) * 150 + (Math.random() - 0.5) * 4000),
        weekIndex: i,
      })
    }

    return { hourly, weekly, monthly, locations }
  }, [])
}

const WEEKS_OPTIONS = [
  { value: 12, label: 'Last 12 weeks' },
  { value: 24, label: 'Last 24 weeks' },
] as const

export function Dashboard() {
  const { hourly, weekly, monthly, locations } = useSampleData()
  const [locationFilter, setLocationFilter] = useState<string>('All')
  const [weeksToShow, setWeeksToShow] = useState<number>(12)

  const filteredMonthly = useMemo(() => {
    if (locationFilter === 'All') {
      const byMonth = new Map<string, number>()
      monthly.forEach(({ month, count }) => byMonth.set(month, (byMonth.get(month) ?? 0) + count))
      return Array.from(byMonth.entries()).map(([month, count]) => ({ month, count }))
    }
    return monthly.filter((r) => r.location === locationFilter).map(({ month, count }) => ({ month, count }))
  }, [monthly, locationFilter])

  const filteredWeekly = useMemo(() => {
    return weekly
      .filter((r) => r.weekIndex < weeksToShow)
      .map(({ week, weekday, weekend }) => ({ week, weekday, weekend }))
  }, [weekly, weeksToShow])

  return (
    <div className="dashboard">
      <div className="dashboard-intro">
        <h2 className="dashboard-title">Pedestrian patterns over time</h2>
        <p className="dashboard-desc">
          Trends, time-of-day patterns, and weekday vs weekend. Connect your Genie or warehouse API to show live data.
        </p>
      </div>

      <section className="dashboard-section">
        <h3 className="dashboard-section-title">Daily footfall trend (monthly)</h3>
        <div className="dashboard-chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={filteredMonthly} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), 'Count']}
                labelFormatter={(label) => `Month: ${label}`}
                contentStyle={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              />
              <Line type="monotone" dataKey="count" stroke="var(--com-blue)" strokeWidth={2} dot={{ r: 3 }} name="Pedestrian count" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="dashboard-filter">
          <label htmlFor="location-select">Location</label>
          <select
            id="location-select"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="dashboard-select"
            aria-label="Filter by location"
          >
            <option value="All">All locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="dashboard-section">
        <h3 className="dashboard-section-title">Time of day pattern (average by hour)</h3>
        <div className="dashboard-chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hourly} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="short" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), 'Count']}
                labelFormatter={(label) => `Hour: ${label}`}
                contentStyle={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              />
              <Bar dataKey="count" fill="var(--com-blue)" radius={[4, 4, 0, 0]} name="Pedestrian count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dashboard-section">
        <h3 className="dashboard-section-title">Weekday vs weekend (weekly)</h3>
        <div className="dashboard-chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={filteredWeekly} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), 'Count']}
                contentStyle={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              />
              <Legend />
              <Area type="monotone" dataKey="weekday" stroke="var(--com-blue)" fill="var(--com-blue)" fillOpacity={0.4} name="Weekday" />
              <Area type="monotone" dataKey="weekend" stroke="var(--com-gold)" fill="var(--com-gold)" fillOpacity={0.35} name="Weekend" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="dashboard-filter">
          <label htmlFor="weeks-select">Weeks to show</label>
          <select
            id="weeks-select"
            value={weeksToShow}
            onChange={(e) => setWeeksToShow(Number(e.target.value))}
            className="dashboard-select"
            aria-label="Filter by number of weeks"
          >
            {WEEKS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </section>
    </div>
  )
}
