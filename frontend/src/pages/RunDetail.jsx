import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import HRZoneBar from '../components/HRZoneBar.jsx'
import LapChart from '../components/LapChart.jsx'

const BADGE = {
  generic: { label: 'OUTDOOR', color: '#a8ff3e' },
  track: { label: 'TRACK', color: '#ff8c00' },
  treadmill: { label: 'TREADMILL', color: '#888' },
}

function stripDecimals(val) {
  if (!val) return val
  return String(val).replace(/\.\d+/, '')
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 16, padding: '24px 26px', ...style }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>
      {children}
    </div>
  )
}

function BigMetric({ label, value, unit, color = '#fff', large = false }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: 1.2, marginBottom: 6, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: large ? 36 : 26, fontWeight: 800, color, lineHeight: 1 }}>
          {value ?? '—'}
        </span>
        {unit && <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>{unit}</span>}
      </div>
    </div>
  )
}

export default function RunDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/runs/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { setRun(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div style={{ color: '#555', padding: 40 }}>Loading…</div>
  }
  if (!run) {
    return <div style={{ color: '#555', padding: 40 }}>Run not found.</div>
  }

  const badge = BADGE[run.sub_sport] || BADGE.generic

  return (
    <div style={{ maxWidth: 900 }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13, marginBottom: 20, padding: 0 }}
      >
        ← Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: 0.5 }}>{run.name || 'Run'}</h1>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1,
          color: badge.color, background: `${badge.color}20`,
          padding: '3px 10px', borderRadius: 20,
        }}>
          {badge.label}
        </span>
      </div>
      <div style={{ color: '#555', fontSize: 13, marginBottom: 28 }}>{formatDate(run.start_time)}</div>

      {/* Primary metrics */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 24 }}>
          <BigMetric label="Distance" value={run.distance_miles} unit="mi" color="#a8ff3e" large />
          <BigMetric label="Time" value={stripDecimals(run.elapsed_time)} />
          <BigMetric label="Avg Pace" value={stripDecimals(run.avg_pace)} unit="/mi" />
          <BigMetric label="Avg HR" value={run.avg_hr} unit="bpm" color="#ff8c00" />
          <BigMetric label="Max HR" value={run.max_hr} unit="bpm" />
          <BigMetric label="Calories" value={run.calories} unit="kcal" />
        </div>
      </Card>

      {/* Secondary metrics */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 24 }}>
          <BigMetric label="VO2 Max" value={run.vo2_max} />
          <BigMetric label="Training Effect" value={run.training_effect} />
          <BigMetric label="Anaerobic TE" value={run.anaerobic_training_effect} />
          <BigMetric label="Cadence" value={run.avg_steps_per_min} unit="spm" />
          <BigMetric label="Step Length" value={run.avg_step_length ? Math.round(run.avg_step_length) : null} unit="cm" />
          <BigMetric label="Vert. Oscillation" value={run.avg_vertical_oscillation} unit="cm" />
        </div>
      </Card>

      {/* HR Zones */}
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>Heart Rate Zones</SectionLabel>
        <HRZoneBar data={run} />
      </Card>

      {/* Lap chart */}
      {run.laps?.length > 0 && (
        <Card>
          <SectionLabel>Lap Breakdown — Pace &amp; HR</SectionLabel>
          <LapChart laps={run.laps} />
          <div style={{ marginTop: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, color: '#999' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                  {['Lap', 'Dist', 'Time', 'Pace', 'Avg HR', 'Max HR'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 700, letterSpacing: 0.8, color: '#555', textTransform: 'uppercase', fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {run.laps.map(lap => (
                  <tr key={lap.lap} style={{ borderBottom: '1px solid #1f1f1f' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#fff' }}>Lap {lap.lap}</td>
                    <td style={{ padding: '8px 10px' }}>{lap.distance_miles} mi</td>
                    <td style={{ padding: '8px 10px' }}>{stripDecimals(lap.elapsed_time)}</td>
                    <td style={{ padding: '8px 10px', color: '#a8ff3e', fontWeight: 600 }}>{stripDecimals(lap.pace)}/mi</td>
                    <td style={{ padding: '8px 10px', color: '#ff8c00' }}>{lap.avg_hr}</td>
                    <td style={{ padding: '8px 10px' }}>{lap.max_hr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
