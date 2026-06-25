import { useState, useEffect } from 'react'
import RunCard from '../components/RunCard.jsx'

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Outdoor', value: 'outdoor' },
  { label: 'Track', value: 'track' },
  { label: 'Treadmill', value: 'treadmill' },
]

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 16px',
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.8,
        background: active ? '#a8ff3e' : '#1e1e1e',
        color: active ? '#111' : '#888',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  )
}

export default function RunsList() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    const url = filter ? `/api/runs?type=${filter}` : '/api/runs'
    fetch(url)
      .then(r => r.json())
      .then(data => { setRuns(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
          Runs
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {FILTERS.map(f => (
            <Pill
              key={f.value}
              label={f.label}
              active={filter === f.value}
              onClick={() => setFilter(f.value)}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: '#1a1a1a', borderRadius: 16, height: 160, opacity: 0.5 }} />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div style={{ color: '#555', textAlign: 'center', paddingTop: 80, fontSize: 15 }}>
          No runs found
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {runs.map(run => <RunCard key={run.activity_id} run={run} />)}
        </div>
      )}
    </div>
  )
}
