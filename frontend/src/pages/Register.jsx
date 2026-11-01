import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import { ErrorBanner, Field, Spinner } from '../components/ui'

const roleNotes = [
  {
    icon: 'shield',
    title: 'Owner — you, at signup',
    body: 'Creates the clinic, manages doctors and working hours, and assigns every staff login.',
  },
  {
    icon: 'users',
    title: 'Reception — added by you',
    body: 'Books visits, confirms patients and works the waitlist recovery board.',
  },
  {
    icon: 'stethoscope',
    title: 'Doctor — added by you',
    body: 'Sees the day schedule and records attendance. Cannot change the calendar setup.',
  },
]

export default function Register() {
  const { register, user, ready } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    clinicName: '',
    clinicPhone: '',
    clinicAddress: '',
    ownerName: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (ready && user) navigate('/app', { replace: true })
  }, [ready, user, navigate])

  function update(key) {
    return (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Choose a password of at least 8 characters.')
      return
    }
    if (form.password !== form.confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await register({
        clinicName: form.clinicName.trim(),
        clinicPhone: form.clinicPhone.trim(),
        clinicAddress: form.clinicAddress.trim(),
        ownerName: form.ownerName.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-950 p-10 text-white lg:flex">
        <div className="absolute -left-24 bottom-1/4 h-80 w-80 rounded-full bg-teal-600/20 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <Link to="/">
            <Logo variant="light" />
          </Link>
          <div className="mt-16 max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">
              Open a clinic account
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white">
              One signup for the clinic. Then you assign the team.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-teal-100/70">
              The clinic owner registers first. Doctors and reception never sign themselves up — you create
              their accounts from Team &amp; access and hand over the password.
            </p>
          </div>

          <div className="mt-10 space-y-3">
            {roleNotes.map((role) => (
              <div key={role.title} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-teal-300">
                  <Icon name={role.icon} className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{role.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-teal-100/60">{role.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-teal-100/40">
          A new clinic starts empty — add your doctors and their hours, then start booking.
        </p>
      </div>

      <div className="flex flex-col justify-center bg-sand-50 px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-lg">
          <div className="lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <div className="mt-8 lg:mt-0">
            <p className="eyebrow">Get started</p>
            <h2 className="mt-2 font-display text-3xl font-bold">Register your clinic</h2>
            <p className="mt-2 text-sm text-muted">
              You become the clinic owner. Doctors and reception accounts are created by you afterwards.
            </p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-5">
            {error && <ErrorBanner message={error} />}

            <div className="space-y-4 rounded-2xl border border-sand-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Clinic</p>
              <Field label="Clinic name">
                <input
                  className="input"
                  value={form.clinicName}
                  onChange={update('clinicName')}
                  placeholder="Northbridge Family Clinic"
                  maxLength={160}
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Clinic phone" hint="Optional">
                  <input
                    className="input"
                    value={form.clinicPhone}
                    onChange={update('clinicPhone')}
                    placeholder="+91 80 4123 8890"
                    maxLength={40}
                  />
                </Field>
                <Field label="City / address" hint="Optional">
                  <input
                    className="input"
                    value={form.clinicAddress}
                    onChange={update('clinicAddress')}
                    placeholder="14 Linden Road, Bengaluru"
                    maxLength={255}
                  />
                </Field>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-sand-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Owner account</p>
              <Field label="Your full name">
                <input
                  className="input"
                  value={form.ownerName}
                  onChange={update('ownerName')}
                  placeholder="Priya Menon"
                  maxLength={120}
                  required
                />
              </Field>
              <Field label="Work email">
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={update('email')}
                  autoComplete="email"
                  placeholder="you@yourclinic.com"
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Password" hint="At least 8 characters">
                  <input
                    type="password"
                    className="input"
                    value={form.password}
                    onChange={update('password')}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </Field>
                <Field label="Confirm password">
                  <input
                    type="password"
                    className="input"
                    value={form.confirm}
                    onChange={update('confirm')}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </Field>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy ? <Spinner /> : <Icon name="arrow-right" className="h-4 w-4" />}
              Create clinic and open workspace
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-teal-700 hover:underline">
              Sign in
            </Link>
          </p>
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
