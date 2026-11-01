import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Avatar, Empty, ErrorBanner, Field, Loading, Modal, useToast } from '../components/ui'
import Icon from '../components/Icon'

const ROLE_META = {
  OWNER: {
    label: 'Clinic owner',
    chip: 'bg-navy-900 text-white',
    hint: 'Full access: doctors, working hours, staff accounts and analytics.',
  },
  RECEPTIONIST: {
    label: 'Reception',
    chip: 'bg-teal-50 text-teal-700',
    hint: 'Books visits, confirms patients and works the recovery board.',
  },
  DOCTOR: {
    label: 'Doctor',
    chip: 'bg-amber-100 text-amber-600',
    hint: 'Read-mostly: schedule and attendance, no calendar or staff changes.',
  },
}

const emptyForm = { name: '', email: '', password: '', role: 'RECEPTIONIST' }

export default function Team() {
  const { user } = useAuth()
  const notify = useToast()
  const isOwner = user?.role === 'OWNER'

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isOwner) {
      setLoading(false)
      return undefined
    }
    let active = true
    api
      .team()
      .then((data) => {
        if (active) setMembers(data || [])
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isOwner])

  function update(key) {
    return (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  }

  async function addMember(event) {
    event.preventDefault()
    setFormError('')
    if (form.password.length < 8) {
      setFormError('Choose a password of at least 8 characters.')
      return
    }
    setBusy(true)
    try {
      const created = await api.addTeamMember({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      })
      setMembers((current) => [...current, created])
      setForm(emptyForm)
      setOpen(false)
      notify(`${created.name} can sign in as ${ROLE_META[created.role]?.label.toLowerCase() || created.role}.`)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!isOwner) {
    return (
      <div className="card">
        <Empty
          icon="shield"
          title="Only the clinic owner manages staff"
          hint="Ask your clinic owner to add a reception or doctor account for you, then sign in with those credentials."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="max-w-xl">
          <p className="eyebrow">Team &amp; access</p>
          <h2 className="mt-1.5 text-lg font-semibold text-navy-900">Who can sign in to {user?.clinicName}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Your clinic was registered with an owner account. Add a reception or doctor login here and share the
            password with them — staff cannot register themselves.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          <Icon name="user-plus" className="h-4 w-4" />
          Add staff account
        </button>
      </section>

      {error && <ErrorBanner message={error} />}

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-sand-200 px-5 py-3">
          <p className="text-sm font-semibold text-navy-900">Accounts with access</p>
          <span className="chip bg-sand-100 text-[11px] text-muted">{members.length} active</span>
        </div>

        {loading ? (
          <Loading label="Loading your team" />
        ) : members.length === 0 ? (
          <Empty
            icon="users"
            title="No staff accounts yet"
            hint="Add the reception desk first — they run the day-to-day booking and recovery workflow."
            action={
              <button type="button" className="btn-outline" onClick={() => setOpen(true)}>
                <Icon name="plus" className="h-4 w-4" />
                Add the first staff account
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-sand-200">
            {members.map((member) => {
              const meta = ROLE_META[member.role] || { label: member.role, chip: 'bg-sand-200 text-navy-700', hint: '' }
              return (
                <li key={member.userId} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <Avatar name={member.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">
                      {member.name}
                      {member.userId === user?.id && <span className="ml-2 text-[11px] font-medium text-muted">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`chip text-[11px] ${meta.chip}`}>{meta.label}</span>
                    <p className="mt-1 hidden max-w-[280px] text-[11px] text-muted sm:block">{meta.hint}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <p className="text-sm font-semibold text-navy-900">What each role can do</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {Object.entries(ROLE_META).map(([role, meta]) => (
            <div key={role} className="rounded-xl border border-sand-200 bg-sand-50 p-3.5">
              <span className={`chip text-[11px] ${meta.chip}`}>{meta.label}</span>
              <p className="mt-2 text-xs leading-relaxed text-muted">{meta.hint}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-xl bg-sand-100 px-4 py-3 text-xs leading-relaxed text-muted">
          A doctor login only grants access to the workspace. To put a doctor on the calendar, add their name,
          specialty and working hours under <strong className="font-semibold text-navy-800">Doctors &amp; hours</strong>.
        </p>
      </section>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setFormError('')
        }}
        title="Add a staff account"
        subtitle="Reception or doctor access for your clinic"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setOpen(false)
                setFormError('')
              }}
            >
              Cancel
            </button>
            <button type="submit" form="staff-form" className="btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </>
        }
      >
        <form id="staff-form" onSubmit={addMember} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}
          <Field label="Full name">
            <input className="input" value={form.name} onChange={update('name')} maxLength={120} required />
          </Field>
          <Field label="Work email">
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={update('email')}
              autoComplete="off"
              required
            />
          </Field>
          <Field label="Role">
            <select className="input" value={form.role} onChange={update('role')}>
              <option value="RECEPTIONIST">Reception — bookings and recovery</option>
              <option value="DOCTOR">Doctor — schedule and attendance</option>
            </select>
          </Field>
          <Field label="Temporary password" hint="At least 8 characters. Share it with the staff member.">
            <input
              type="text"
              className="input font-mono"
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
