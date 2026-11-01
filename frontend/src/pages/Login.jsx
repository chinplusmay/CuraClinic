import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import { ErrorBanner, Field, Spinner } from '../components/ui'

const demoAccounts = [
  { label: 'Clinic owner', email: 'owner@northbridgeclinic.com', note: 'Full access · Priya Menon' },
  { label: 'Reception', email: 'reception@northbridgeclinic.com', note: 'Booking & recovery · Rhea Kapoor' },
  { label: 'Doctor', email: 'doctor@northbridgeclinic.com', note: 'Read-only schedule · Dr. Ananya Rao' },
]

export default function Login() {
  const { login, user, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('owner@northbridgeclinic.com')
  const [password, setPassword] = useState('clinicflow123')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (ready && user) navigate(location.state?.from || '/app', { replace: true })
  }, [ready, user, navigate, location.state])

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email.trim(), password)
      navigate(location.state?.from || '/app', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-950 p-10 text-white lg:flex">
        <div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-teal-600/20 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <Link to="/">
            <Logo variant="light" />
          </Link>
          <div className="mt-20 max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">
              Appointment operations
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white">
              Every unconfirmed visit is a slot you might lose.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-teal-100/70">
              Confirm visits, recover cancellations from the waitlist and measure the leakage. The demo workspace
              is seeded with six weeks of clinic activity so every screen is meaningful.
            </p>
          </div>
        </div>

        <div className="relative grid gap-3 sm:grid-cols-3">
          {[
            ['36', 'visits today'],
            ['17', 'unconfirmed'],
            ['5', 'open slots'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="font-display text-2xl font-bold text-white">{value}</p>
              <p className="text-[11px] text-teal-100/60">{label}</p>
            </div>
          ))}
        </div>

        <p className="relative text-[11px] text-teal-100/40">
          Demo environment · synthetic clinic data · not for clinical use
        </p>
      </div>

      <div className="flex flex-col justify-center bg-sand-50 px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <div className="mt-8 lg:mt-0">
            <p className="eyebrow">Welcome back</p>
            <h2 className="mt-2 font-display text-3xl font-bold">Sign in to your clinic</h2>
            <p className="mt-2 text-sm text-muted">
              Use a demo account below, or the credentials your clinic owner set up.
            </p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {error && <ErrorBanner message={error} />}
            <Field label="Work email">
              <input
                type="email"
                className="input"
                value={email}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-11"
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-2 px-2 text-xs font-semibold text-muted hover:text-navy-900"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
            <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy ? <Spinner /> : <Icon name="arrow-right" className="h-4 w-4" />}
              Open the workspace
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            New clinic?{' '}
            <Link to="/register" className="font-semibold text-teal-700 hover:underline">
              Create a clinic account
            </Link>
          </p>

          <div className="mt-6 rounded-2xl border border-sand-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Demo accounts</p>
            <div className="mt-3 space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email)
                    setPassword('clinicflow123')
                    setError('')
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    email === account.email
                      ? 'border-teal-300 bg-teal-50'
                      : 'border-sand-200 hover:border-teal-200 hover:bg-sand-50'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold text-navy-900">{account.label}</span>
                    <span className="block text-[11px] text-muted">{account.note}</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted">{account.email.split('@')[0]}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted">
              Password for all demo accounts: <span className="font-mono font-semibold text-navy-800">clinicflow123</span>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            <Link to="/" className="font-semibold text-teal-700 hover:underline">
              Back to the CuraClinic home page
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
