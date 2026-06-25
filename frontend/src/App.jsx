import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import RunsList from './pages/RunsList.jsx'
import RunDetail from './pages/RunDetail.jsx'
import Stats from './pages/Stats.jsx'

const IconList = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)

const IconChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)

const sidebarStyle = {
  position: 'fixed',
  left: 0,
  top: 0,
  bottom: 0,
  width: 64,
  background: '#0d0d0d',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  paddingTop: 24,
  gap: 12,
  zIndex: 100,
}

const logoStyle = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: '#a8ff3e',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,
  color: '#111',
  fontSize: 18,
  fontWeight: 900,
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <nav style={sidebarStyle}>
          <div style={logoStyle}>R</div>
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: isActive ? 'rgba(168,255,62,0.12)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isActive ? '#a8ff3e' : '#666',
              transition: 'all 0.2s',
            })}
            title="Runs"
          >
            <IconList />
          </NavLink>
          <NavLink
            to="/stats"
            style={({ isActive }) => ({
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: isActive ? 'rgba(168,255,62,0.12)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isActive ? '#a8ff3e' : '#666',
              transition: 'all 0.2s',
            })}
            title="Stats"
          >
            <IconChart />
          </NavLink>
        </nav>

        <main style={{ marginLeft: 64, flex: 1, padding: '32px 28px', overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<RunsList />} />
            <Route path="/runs/:id" element={<RunDetail />} />
            <Route path="/stats" element={<Stats />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
