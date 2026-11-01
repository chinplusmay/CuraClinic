import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Avatar } from './ui'
import Icon from './Icon'
import Logo from './Logo'
import { BookingProvider, useBooking } from './Booking'
import { longDayLabel, todayIso } from '../lib/format'

const navigation = [
  { to: '/app', end: true, label: 'Reception desk', icon: 'grid' },
  { to: '/app/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/app/appointments', label: 'Appointments', icon: 'list' },
  { to: '/app/waitlist', label: 'Waitlist & recovery', icon: 'clock' },
  { to: '/app/patients', label: 'Patients', icon: 'users' },
  { to: '/app/doctors', label: 'Doctors & hours', icon: 'stethoscope' },
  { to: '/app/analytics', label: 'Analytics', icon: 'chart' },
  { to: '/app/team', label: 'Team & access', icon: 'user-plus', ownerOnly: true },
]

const titles = {
  '/app': 'Reception desk',
  '/app/calendar': 'Appointment calendar',
  '/app/appointments': 'Appointments',
  '/app/waitlist': 'Waitlist & recovery',
  '/app/patients': 'Patient directory',
  '/app/doctors': 'Doctors & availability',
  '/app/analytics': 'Operations analytics',
  '/app/team': 'Team & access',
}

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth()
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-5 pt-6">
        <Link to="/" aria-label="CuraClinic home">
          <Logo variant="light" />
        </Link>
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-200/70">Workspace</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-white">{user?.clinicName}</p>
          <p className="text-[11px] text-teal-100/50">Outpatient clinic · General medicine</p>
        </div>
      </div>

      <nav className="scroll-thin flex-1 space-y-1 overflow-y-auto px-3">
        {navigation
          .filter((item) => !item.ownerOnly || user?.role === 'OWNER')
          .map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
          >
            <Icon name={item.icon} className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <Avatar name={user?.name} className="h-9 w-9 bg-teal-400/20 text-[11px] text-teal-100" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="text-[11px] capitalize text-teal-100/50">{user?.role?.toLowerCase()}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="rounded-lg p-1.5 text-teal-100/60 transition hover:bg-white/10 hover:text-white"
          >
            <Icon name="logout" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function Shell() {
  const { user } = useAuth()
  const { openBooking } = useBooking()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const title = titles[location.pathname] || 'CuraClinic'

  return (
    <div className="min-h-screen bg-sand-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-navy-950 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-navy-950 shadow-lift">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-sand-200 bg-sand-50/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-2 text-navy-800 hover:bg-sand-200 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Icon name="menu" className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {longDayLabel(todayIso())}
                </p>
                <h1 className="truncate text-lg font-semibold text-navy-900">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user?.role !== 'DOCTOR' && (
                <button type="button" className="btn-primary btn-sm sm:px-3.5 sm:py-2 sm:text-sm" onClick={() => openBooking()}>
                  <Icon name="plus" className="h-4 w-4" />
                  <span className="hidden sm:inline">New appointment</span>
                  <span className="sm:hidden">Book</span>
                </button>
              )}
              <div className="hidden items-center gap-2 rounded-xl border border-sand-200 bg-white px-2.5 py-1.5 sm:flex">
                <Avatar name={user?.name} className="h-7 w-7 text-[10px]" />
                <span className="text-xs font-medium text-navy-800">{user?.name}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        <footer className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 pb-6 text-[11px] text-muted sm:px-6 lg:px-8">
          <span>CuraClinic · appointment operations for independent clinics</span>
          <Link to="/" className="hover:text-navy-900">
            About CuraClinic
          </Link>
        </footer>
      </div>
    </div>
  )
}

export default function AppLayout() {
  return (
    <BookingProvider>
      <Shell />
    </BookingProvider>
  )
}
