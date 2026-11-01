import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useBooking } from '../components/Booking'
import {
  Avatar,
  Drawer,
  Empty,
  ErrorBanner,
  Field,
  Loading,
  Modal,
  Spinner,
  StatusChip,
  useToast,
} from '../components/ui'
import Icon from '../components/Icon'
import { dayLabel, relativeDayLabel, timeLabel } from '../lib/format'

const emptyForm = { name: '', phone: '', email: '', notes: '' }

export default function Patients() {
  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const toast = useToast()
  const { user } = useAuth()
  const { openBooking } = useBooking()
  const canManage = user?.role !== 'DOCTOR'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.patients(query)
      setPatients(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    const timer = setTimeout(load, 220)
    return () => clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    let active = true
    setDetailLoading(true)
    api
      .patient(selectedId)
      .then((data) => active && setDetail(data))
      .catch((err) => active && toast(err.message, 'error'))
      .finally(() => active && setDetailLoading(false))
    return () => {
      active = false
    }
  }, [selectedId, toast])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(patient) {
    setEditing(patient)
    setForm({
      name: patient.name,
      phone: patient.phone,
      email: patient.email || '',
      notes: patient.notes || '',
    })
    setFormOpen(true)
  }

  async function submitForm(event) {
    event.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.updatePatient(editing.id, form)
        toast('Patient details updated', 'success')
        if (selectedId === editing.id) {
          const refreshed = await api.patient(editing.id)
          setDetail(refreshed)
        }
      } else {
        const created = await api.createPatient(form)
        toast(`${created.name} added to the directory`, 'success')
        setSelectedId(created.id)
      }
      setFormOpen(false)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">Patient directory</h2>
          <p className="mt-0.5 text-sm text-muted">
            Minimal contact details — no clinical records. {patients.length} patients shown.
          </p>
        </div>
        {canManage && (
          <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
            <Icon name="user-plus" className="h-4 w-4" /> Add patient
          </button>
        )}
      </div>

      <div className="card p-3">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-sand-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, phone or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="card overflow-hidden">
        {loading ? (
          <Loading label="Loading patients" />
        ) : patients.length === 0 ? (
          <Empty
            icon="users"
            title="No patients match"
            hint="Try a different search, or add the patient to the directory."
            action={<button type="button" className="btn-primary btn-sm" onClick={openCreate}>Add patient</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className="table-head">Patient</th>
                  <th className="table-head">Contact</th>
                  <th className="table-head">Last attended</th>
                  <th className="table-head">Visits</th>
                  <th className="table-head">No-shows</th>
                  <th className="table-head" />
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => setSelectedId(patient.id)}
                    className="cursor-pointer transition hover:bg-sand-50"
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Avatar name={patient.name} className="h-8 w-8 text-[10px]" />
                        <div>
                          <p className="font-medium text-navy-900">{patient.name}</p>
                          {patient.notes && (
                            <p className="max-w-[240px] truncate text-[11px] text-muted">{patient.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-xs">
                      <p className="text-navy-900">{patient.phone}</p>
                      <p className="text-muted">{patient.email || 'No email on file'}</p>
                    </td>
                    <td className="table-cell text-xs text-muted">
                      {patient.lastVisitAt ? relativeDayLabel(patient.lastVisitAt.slice(0, 10)) : '—'}
                    </td>
                    <td className="table-cell text-navy-900">{patient.totalAppointments}</td>
                    <td className="table-cell">
                      {patient.noShowCount > 0 ? (
                        <span className="chip bg-clay-50 text-clay-500">{patient.noShowCount}</span>
                      ) : (
                        <span className="text-xs text-muted">0</span>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      <Icon name="chevron-right" className="ml-auto h-4 w-4 text-sand-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit patient' : 'Add a patient'}
        subtitle="Only what the clinic needs to contact and book the patient."
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="patient-form" className="btn-primary" disabled={saving}>
              {saving ? <Spinner /> : <Icon name="check" className="h-4 w-4" />}
              {editing ? 'Save changes' : 'Add patient'}
            </button>
          </>
        }
      >
        <form id="patient-form" onSubmit={submitForm} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </Field>
          <Field label="Phone">
            <input
              className="input"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              required
            />
          </Field>
          <Field label="Email (optional)" className="sm:col-span-2">
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </Field>
          <Field label="Front-desk notes (optional)" className="sm:col-span-2">
            <textarea
              className="input min-h-[90px]"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Preferences, accessibility needs, reminder channel…"
            />
          </Field>
        </form>
      </Modal>

      <Drawer
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title={detail?.patient.name || 'Patient'}
        subtitle={detail ? `${detail.patient.phone} · patient since ${dayLabel(detail.patient.createdAt)}` : undefined}
        footer={
          detail && (
            <div className="flex gap-2">
              <button type="button" className="btn-outline flex-1" onClick={() => openEdit(detail.patient)}>
                Edit details
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() =>
                  openBooking({
                    patient: detail.patient,
                    onBooked: () => {
                      api.patient(detail.patient.id).then(setDetail)
                      load()
                    },
                  })
                }
              >
                <Icon name="calendar" className="h-4 w-4" /> Book visit
              </button>
            </div>
          )
        }
      >
        {detailLoading && <Loading label="Loading patient" />}
        {!detailLoading && detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Visits', detail.patient.totalAppointments],
                ['Attended recently', detail.appointments.filter((item) => item.status === 'COMPLETED').length],
                ['No-shows', detail.patient.noShowCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-sand-200 bg-sand-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
                  <p className="mt-0.5 font-display text-lg font-bold text-navy-900">{value}</p>
                </div>
              ))}
            </div>

            {detail.patient.email && (
              <p className="flex items-center gap-2 text-sm text-navy-800">
                <Icon name="mail" className="h-4 w-4 text-teal-600" /> {detail.patient.email}
              </p>
            )}
            {detail.patient.notes && (
              <div className="rounded-xl border border-amber-300/60 bg-amber-100/40 px-3 py-2.5 text-xs leading-relaxed text-navy-800">
                <span className="font-semibold">Front-desk note: </span>
                {detail.patient.notes}
              </div>
            )}

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Appointment history</p>
              {detail.appointments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-sand-300 px-3 py-4 text-xs text-muted">
                  No appointments yet. Book the first visit.
                </p>
              ) : (
                <ul className="space-y-2">
                  {detail.appointments.slice(0, 20).map((appointment) => (
                    <li key={appointment.id} className="rounded-xl border border-sand-200 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-navy-900">
                            {dayLabel(appointment.startAt)} · {timeLabel(appointment.startAt)}
                          </p>
                          <p className="text-[11px] text-muted">Dr. {appointment.doctor.name}</p>
                        </div>
                        <StatusChip status={appointment.status} />
                      </div>
                      {appointment.recovered && (
                        <p className="mt-1 text-[10px] font-medium text-teal-700">Booked from the waitlist</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
