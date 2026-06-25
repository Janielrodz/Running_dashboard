import { useState } from 'react'

const ZONES = [
  { key: 'hrz_1_time', label: 'Zone 1', color: '#6ee7b7' },
  { key: 'hrz_2_time', label: 'Zone 2', color: '#a8ff3e' },
  { key: 'hrz_3_time', label: 'Zone 3', color: '#fbbf24' },
  { key: 'hrz_4_time', label: 'Zone 4', color: '#ff8c00' },
  { key: 'hrz_5_time', label: 'Zone 5', color: '#ef4444' },
]

function parseTime(t) {
  if (!t) return 0
  const parts = String(t).replace(/\.\d+/, '').split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0]
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function HRZoneBar({ data }) {
  const [tooltip, setTooltip] = useState(null)

  const seconds = ZONES.map(z => parseTime(data[z.key]))
  const total = seconds.reduce((a, b) => a + b, 0)

  if (total === 0) return <div style={{ color: '#555', fontSize: 13 }}>No HR zone data</div>

  return (
    <div>
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 28, position: 'relative' }}>
        {ZONES.map((z, i) => {
          const pct = (seconds[i] / total) * 100
          if (pct < 0.5) return null
          return (
            <div
              key={z.key}
              style={{ width: `${pct}%`, background: z.color, cursor: 'default', transition: 'opacity 0.15s' }}
              onMouseEnter={() => setTooltip({ label: z.label, color: z.color, time: seconds[i], pct: pct.toFixed(0) })}
              onMouseLeave={() => setTooltip(null)}
            />
          )
        })}
      </div>

      {tooltip && (
        <div style={{
          marginTop: 8,
          fontSize: 12,
          color: tooltip.color,
          fontWeight: 700,
          letterSpacing: 0.5,
        }}>
          {tooltip.label} — {formatTime(tooltip.time)} ({tooltip.pct}%)
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
        {ZONES.map((z, i) => (
          <div key={z.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: z.color }} />
            <span style={{ fontSize: 11, color: '#666' }}>{z.label.replace('Zone ', 'Z')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
