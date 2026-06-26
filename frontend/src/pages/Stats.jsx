import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

const RANGE_OPTIONS = [
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
  { label: 'All', days: null },
]

function secsToPace(s) {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
        fontSize: 12, fontWeight: 700, letterSpacing: 0.8,
        background: active ? '#a8ff3e' : '#1e1e1e',
        color: active ? '#111' : '#888',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 16, padding: '22px 24px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#222', border: '1px solid #333', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#a8ff3e', fontWeight: 700 }}>{secsToPace(payload[0].value)}/mi</div>
    </div>
  )
}

function WeeklyStatCard({ label, value, sub, date, onPrevious, onNext, previousDisabled, nextDisabled }) {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 16, padding: '22px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          {label}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onPrevious} disabled={previousDisabled}>←</button>
          <button onClick={onNext} disabled={nextDisabled}>→</button>
        </div>
      </div>

      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
        {value ?? '—'}
      </div>

      {sub && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{sub}</div>}

      {date && (
        <div style={{ fontSize: 12, color: '#666', marginTop: 12 }}>
          Week of {date.slice(0, 10)}
        </div>
      )}
    </div>
  )
}

export default function Stats() {
  const [data, setData] = useState(null)
  const [range, setRange] = useState(90)
  const [loading, setLoading] = useState(true)
  const [calorieWeekIndex, setCalorieWeekIndex] = useState(0)

  useEffect(() => {
    fetch('/api/stats/summary')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const chartData = (() => {
    if (!data?.pace_history) return []
    const cutoff = range
      ? new Date(Date.now() - range * 86400000).toISOString().slice(0, 10)
      : '1970-01-01'
    return data.pace_history
      .filter(p => p.date >= cutoff)
      .map(p => ({ date: p.date, pace: p.avg_pace_seconds }))
  })()

  const paceVals = chartData.map(d => d.pace).filter(Boolean)
  const minPace = paceVals.length ? Math.min(...paceVals) : 0
  const maxPace = paceVals.length ? Math.max(...paceVals) : 600

  const weeklyCalories = data?.weekly_calories || []
  const selectedCaloriesWeek = weeklyCalories[calorieWeekIndex]

  const previousCaloriesWeek = () => {
    if (calorieWeekIndex < weeklyCalories.length - 1) {
      setCalorieWeekIndex(calorieWeekIndex + 1)
    }
  }

  const nextCaloriesWeek = () => {
    if (calorieWeekIndex > 0) {
      setCalorieWeekIndex(calorieWeekIndex - 1)
    }
  }

  if (loading) return <div style={{ color: '#555', padding: 40 }}>Loading…</div>
  if (!data) return <div style={{ color: '#555', padding: 40 }}>Failed to load stats.</div>

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 28 }}>
        Stats
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Runs" value={data.total_runs} />
        <StatCard label="Total Miles" value={data.total_miles} sub="miles" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 28 }}>
        <WeeklyStatCard
          label="Weekly activity calories"
          value={selectedCaloriesWeek?.activities_calories}
          sub="cal"
          date={selectedCaloriesWeek?.first_day}
          onPrevious={previousCaloriesWeek}
          onNext={nextCaloriesWeek}
          previousDisabled={calorieWeekIndex >= weeklyCalories.length - 1}
          nextDisabled={calorieWeekIndex === 0}
        />
        <StatCard label="Zone 2 time in the last 7d (Coming soon)" value={data.total_miles} />
      </div>


      <div style={{ background: '#1a1a1a', borderRadius: 16, padding: '24px 26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Pace Trend
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {RANGE_OPTIONS.map(r => (
              <Pill
                key={r.label}
                label={r.label}
                active={range === r.days}
                onClick={() => setRange(r.days)}
              />
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>No data for this range</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#222" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#666', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={d => d.slice(5)}
              />
              <YAxis
                domain={[maxPace + 30, minPace - 30]}
                tickFormatter={secsToPace}
                tick={{ fill: '#888', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="pace"
                stroke="#a8ff3e"
                strokeWidth={2}
                dot={{ r: 3, fill: '#a8ff3e', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
