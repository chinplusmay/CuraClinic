import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Loading } from './components/ui'
import AppLayout from './components/AppLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CalendarPage from './pages/CalendarPage'
import Appointments from './pages/Appointments'
import Patients from './pages/Patients'
import Waitlist from './pages/Waitlist'
import Doctors from './pages/Doctors'
import Analytics from './pages/Analytics'
import Team from './pages/Team'

function Protected({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <Loading label="Opening your clinic workspace" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="waitlist" element={<Waitlist />} />
        <Route path="patients" element={<Patients />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="team" element={<Team />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
