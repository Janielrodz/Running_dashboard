import { Link } from 'react-router-dom'

const BADGE = {
  generic: { label: 'OUTDOOR', color: '#a8ff3e', bg: 'rgba(168,255,62,0.12)' },
  track: { label: 'TRACK', color: '#ff8c00', bg: 'rgba(255,140,0,0.12)' },
  treadmill: { label: 'TREADMILL', color: '#888', bg: 'rgba(136,136,136,0.12)' },
}

function formatDate(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RunCard({ run }) {
  const badge = BADGE[run.sub_sport] || BADGE.generic

  return (
    <Link
      to={`/runs/${run.activity_id}`}
      style={{
        display: 'block',
        background: '#1a1a1a',
        borderRadius: 16,
        padding: '20px 22px',
        transition: 'transform 0.15s, box-shadow 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#888', fontWeight: 600, letterSpacing: 0.5 }}>
          {formatDate(run.start_time)}
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          color: badge.color,
          background: badge.bg,
          padding: '3px 10px',
          borderRadius: 20,
        }}>
          {badge.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 20 }}>
        <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>
          {run.distance_miles ?? '—'}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#a8ff3e', letterSpacing: 1 }}>MI</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Metric label="PACE" value={run.avg_pace ?? '—'} unit="/mi" />
        <Metric label="AVG HR" value={run.avg_hr ?? '—'} unit="bpm" color="#ff8c00" />
        <Metric label="CAL" value={run.calories ?? '—'} />
      </div>
    </Link>
  )
}

function Metric({ label, value, unit = '', color = '#fff' }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>
        {value}
        {unit && <span style={{ fontSize: 11, color: '#666', marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  )
}
