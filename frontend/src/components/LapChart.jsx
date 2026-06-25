import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

function secsToPace(s) {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const pace = payload.find(p => p.dataKey === 'pace_seconds')
  const hr = payload.find(p => p.dataKey === 'avg_hr')
  return (
    <div style={{ background: '#222', border: '1px solid #333', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#fff' }}>{label}</div>
      {pace && <div style={{ color: '#a8ff3e' }}>Pace: {secsToPace(pace.value)}/mi</div>}
      {hr && <div style={{ color: '#ff8c00' }}>HR: {hr.value} bpm</div>}
    </div>
  )
}

export default function LapChart({ laps }) {
  if (!laps?.length) return null

  const data = laps.map(lap => ({
    name: `Lap ${lap.lap}`,
    pace_seconds: lap.pace_seconds,
    avg_hr: lap.avg_hr,
  }))

  const paceSecs = data.map(d => d.pace_seconds).filter(Boolean)
  const minPace = Math.min(...paceSecs)
  const maxPace = Math.max(...paceSecs)
  const padding = 20

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#222" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#666', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="pace"
          orientation="left"
          domain={[maxPace + padding, minPace - padding]}
          tickFormatter={secsToPace}
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          label={{ value: 'pace', angle: -90, position: 'insideLeft', fill: '#555', fontSize: 11, dy: 20 }}
        />
        <YAxis
          yAxisId="hr"
          orientation="right"
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          unit=" bpm"
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar yAxisId="pace" dataKey="pace_seconds" fill="#a8ff3e" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Line
          yAxisId="hr"
          type="monotone"
          dataKey="avg_hr"
          stroke="#ff8c00"
          strokeWidth={2}
          dot={{ r: 3, fill: '#ff8c00', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
