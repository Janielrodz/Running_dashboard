import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

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
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{sub}</div>}
      {date && (
        <div style={{ fontSize: 12, color: '#666', marginTop: 12 }}>
          Week of {date.slice(0, 10)}
        </div>
      )}
    </div>
  )
}

function VolumeChart() {
  const [data, setData] = useState(null)
  const [grouping, setGrouping] = useState('weekly')
  const [metric, setMetric] = useState('miles')

  useEffect(() => {
    fetch('/api/stats/volume')
      .then(r => r.json())
      .then(setData)
  }, [])

  if (!data) return (
    <div style={{ background: '#1a1a1a', borderRadius: 16, padding: '24px 26px', color: '#555' }}>
      Loading…
    </div>
  )

  const series = data[grouping]

  const fmtPeriod = (p) =>
    grouping === 'weekly'
      ? p.slice(5)
      : new Date(p + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

  const fmtTick = (v) => {
    if (metric === 'miles') return `${v}`
    const h = Math.floor(v / 3600)
    const m = Math.floor((v % 3600) / 60)
    return `${h}h${m}m`
  }

  const VolumeTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    const h = Math.floor(d.time_seconds / 3600)
    const m = Math.floor((d.time_seconds % 3600) / 60)
    return (
      <div style={{ background: '#222', border: '1px solid #333', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
        <div style={{ color: '#888', marginBottom: 4 }}>{fmtPeriod(d.period)}</div>
        <div style={{ color: '#a8ff3e', fontWeight: 700 }}>{d.miles} mi</div>
        <div style={{ color: '#888' }}>{h}h {m}m</div>
      </div>
    )
  }

  return (
    <div style={{ background: '#1a1a1a', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Volume
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['weekly', 'monthly'].map(g => (
              <Pill key={g} label={g.charAt(0).toUpperCase() + g.slice(1)} active={grouping === g} onClick={() => setGrouping(g)} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['miles', 'time'].map(mt => (
              <Pill key={mt} label={mt.charAt(0).toUpperCase() + mt.slice(1)} active={metric === mt} onClick={() => setMetric(mt)} />
            ))}
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#222" vertical={false} />
          <XAxis
            dataKey="period"
            tickFormatter={fmtPeriod}
            tick={{ fill: '#666', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtTick}
            tick={{ fill: '#888', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<VolumeTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar
            dataKey={metric === 'miles' ? 'miles' : 'time_seconds'}
            fill="#a8ff3e"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Stats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [calorieWeekIndex, setCalorieWeekIndex] = useState(0)
  const [z2WeekIndex, setZ2WeekIndex] = useState(0)

  useEffect(() => {
    fetch('/api/stats/summary')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const weeklyCalories = data?.weekly_calories || []
  const selectedCaloriesWeek = weeklyCalories[calorieWeekIndex]

  const z2Weekly = data?.z2_weekly || []
  const selectedZ2Week = z2Weekly[z2WeekIndex]

  const previousCaloriesWeek = () => {
    if (calorieWeekIndex < weeklyCalories.length - 1) setCalorieWeekIndex(calorieWeekIndex + 1)
  }
  const nextCaloriesWeek = () => {
    if (calorieWeekIndex > 0) setCalorieWeekIndex(calorieWeekIndex - 1)
  }
  const previousZ2Week = () => {
    if (z2WeekIndex < z2Weekly.length - 1) setZ2WeekIndex(z2WeekIndex + 1)
  }
  const nextZ2Week = () => {
    if (z2WeekIndex > 0) setZ2WeekIndex(z2WeekIndex - 1)
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
        <WeeklyStatCard
          label="Z2 weekly"
          value={selectedZ2Week?.z2_time}
          sub="time"
          date={selectedZ2Week?.week_start}
          onPrevious={previousZ2Week}
          onNext={nextZ2Week}
          previousDisabled={z2WeekIndex >= z2Weekly.length - 1}
          nextDisabled={z2WeekIndex === 0}
        />
      </div>

      <VolumeChart />
    </div>
  )
}
