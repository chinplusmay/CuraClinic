import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  Avatar,
  ErrorBanner,
  Field,
  Loading,
  Modal,
  Spinner,
  useToast,
} from '../components/ui'
import Icon from '../components/Icon'
import { DAY_NAMES, dayLabel, hhmm, timeLabel } from '../lib/format'

const emptyDoctor = { name: '', specialty: '', active: true }

function hoursSummary(doctor) {
  return DAY_NAMES.map((name, index) => {
    const day = index + 1
    const segments = doctor.schedules.filter((schedule) => schedule.dayOfWeek === day && schedule.active)
    return {
      day,
      name,
      segments,
      label: segments.length
        ? segments.map((segment) => `${hhmm(segment.startTime)}–${hhmm(segment.endTime)}`).join(', ')
        : 'Closed',
    }
  })
}

export default function Doctors() {
  const { user } = useAuth()
  const toast = useToast()
  const canManage = user?.role === 'OWNER'
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyDoctor)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [hoursDoctor, setHoursDoctor] = useState(null)
  const [rows, setRows] = useState([])
  const [blockDoctor, setBlockDoctor] = useState(null)
  const [block, setBlock] = useState({ startAt: '', endAt: '', reason: '' })

  async function load() {
    try {
      setDoctors(await api.doctors())
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyDoctor)
    setFormOpen(true)
  }

  function openEdit(doctor) {
    setEditing(doctor)
    setForm({ name: doctor.name, specialty: doctor.specialty, active: doctor.active })
    setFormOpen(true)
  }

  async function submitDoctor(event) {
    event.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.updateDoctor(editing.id, form)
        toast('Doctor profile updated', 'success')
      } else {
        await api.createDoctor(form)
        toast(`${form.name} added to the clinic`, 'success')
      }
      setFormOpen(false)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function openHours(doctor) {
    setHoursDoctor(doctor)
    setRows(
      doctor.schedules.map((schedule) => ({
        dayOfWeek: schedule.dayOfWeek,
        startTime: hhmm(schedule.startTime),
        endTime: hhmm(schedule.endTime),
        slotMinutes: schedule.slotMinutes,
        active: schedule.active,
      })),
    )
  }

  async function saveHours(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await api.saveSchedules(hoursDoctor.id, rows)
      toast('Working hours saved', 'success')
      setHoursDoctor(null)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function addBlock(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await api.addBlock(blockDoctor.id, block)
      toast('Time off added to the calendar', 'success')
      setBlockDoctor(null)
      setBlock({ startAt: '', endAt: '', reason: '' })
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function removeBlock(doctor, blockId) {
    try {
      await api.removeBlock(doctor.id, blockId)
      toast('Block removed', 'success')
      load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  if (loading) return <Loading label="Loading the clinical team" />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">Doctors & availability</h2>
          <p className="mt-0.5 text-sm text-muted">
            Working hours define the bookable grid. Time off removes slots without deleting the schedule.
          </p>
        </div>
        {canManage && (
          <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
            <Icon name="plus" className="h-4 w-4" /> Add doctor
          </button>
        )}
      </div>

      {!canManage && (
        <div className="rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-xs text-muted">
          You are signed in as {user?.role.toLowerCase()}. Only the clinic owner can change working hours.
        </div>
      )}
      {error && <ErrorBanner message={error} />}

      <div className="grid gap-4 xl:grid-cols-2">
        {doctors.map((doctor) => {
          const hours = hoursSummary(doctor)
          return (
            <article key={doctor.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={doctor.name} className="h-11 w-11 text-sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">Dr. {doctor.name}</h3>
                      {!doctor.active && <span className="chip bg-sand-200 text-navy-700">inactive</span>}
                    </div>
                    <p className="text-xs text-muted">{doctor.specialty}</p>
                  </div>
                </div>
                {canManage && (
                  <button type="button" className="btn-ghost btn-sm" onClick={() => openEdit(doctor)}>
                    Edit
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-1">
                {hours.map((day) => (
                  <div key={day.day} className="flex items-center justify-between gap-3 border-b border-sand-100 py-1.5 last:border-0">
                    <span className="text-xs text-muted">{day.name}</span>
                    <span className={`text-xs ${day.segments.length ? 'font-medium text-navy-900' : 'text-sand-400'}`}>
                      {day.segments.length
                        ? day.segments.map((segment) => `${hhmm(segment.startTime)}–${hhmm(segment.endTime)}`).join(' · ')
                        : 'Closed'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {canManage && (
                  <>
                    <button type="button" className="btn-outline btn-sm" onClick={() => openHours(doctor)}>
                      <Icon name="clock" className="h-3.5 w-3.5" /> Edit hours
                    </button>
                    <button type="button" className="btn-outline btn-sm" onClick={() => setBlockDoctor(doctor)}>
                      <Icon name="calendar" className="h-3.5 w-3.5" /> Add time off
                    </button>
                  </>
                )}
                <span className="text-[11px] text-muted">
                  {doctor.schedules[0]?.slotMinutes || 20}-minute consults
                </span>
              </div>

              {doctor.blocks.length > 0 && (
                <div className="mt-4 rounded-xl bg-sand-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Upcoming time off</p>
                  <ul className="mt-2 space-y-1.5">
                    {doctor.blocks.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-navy-800">
                          {dayLabel(item.startAt)} · {timeLabel(item.startAt)}–{timeLabel(item.endAt)}
                          <span className="text-muted"> {item.reason ? `· ${item.reason}` : ''}</span>
                        </span>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => removeBlock(doctor, item.id)}
                            className="text-muted hover:text-clay-500"
                            title="Remove"
                          >
                            <Icon name="trash" className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          )
        })}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit doctor' : 'Add a doctor'}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" form="doctor-form" className="btn-primary" disabled={saving}>
              {saving ? <Spinner /> : <Icon name="check" className="h-4 w-4" />}
              {editing ? 'Save changes' : 'Add doctor'}
            </button>
          </>
        }
      >
        <form id="doctor-form" onSubmit={submitDoctor} className="space-y-4">
          <Field label="Name">
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              placeholder="e.g. Ananya Rao"
            />
          </Field>
          <Field label="Specialty">
            <input
              className="input"
              value={form.specialty}
              onChange={(event) => setForm({ ...form, specialty: event.target.value })}
              required
              placeholder="e.g. General Medicine"
            />
          </Field>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-navy-800">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
                className="h-4 w-4 rounded border-sand-300 text-teal-600 focus:ring-teal-500"
              />
              Accepting new appointments
            </label>
          )}
          <p className="text-xs text-muted">Working hours are configured after the doctor is created.</p>
        </form>
      </Modal>

      <Modal
        open={Boolean(hoursDoctor)}
        onClose={() => setHoursDoctor(null)}
        title={hoursDoctor ? `Working hours · Dr. ${hoursDoctor.name}` : 'Working hours'}
        subtitle="Each row is a bookable block. Split a day into morning and evening sessions."
        size="lg"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setHoursDoctor(null)}>Cancel</button>
            <button type="submit" form="hours-form" className="btn-primary" disabled={saving}>
              {saving ? <Spinner /> : <Icon name="check" className="h-4 w-4" />} Save hours
            </button>
          </>
        }
      >
        <form id="hours-form" onSubmit={saveHours} className="space-y-3">
          {rows.length === 0 && (
            <p className="rounded-xl border border-dashed border-sand-300 px-3 py-3 text-xs text-muted">
              No working hours yet. Add a row to open the doctor's calendar.
            </p>
          )}
          {rows.map((row, index) => (
            <div key={index} className="grid items-end gap-2 rounded-xl border border-sand-200 p-2.5 sm:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]">
              <Field label="Day">
                <select
                  className="input py-2"
                  value={row.dayOfWeek}
                  onChange={(event) =>
                    setRows(rows.map((item, i) => (i === index ? { ...item, dayOfWeek: Number(event.target.value) } : item)))
                  }
                >
                  {DAY_NAMES.map((name, dayIndex) => (
                    <option key={name} value={dayIndex + 1}>{name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Start">
                <input
                  type="time"
                  className="input py-2"
                  value={row.startTime}
                  onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, startTime: event.target.value } : item)))}
                />
              </Field>
              <Field label="End">
                <input
                  type="time"
                  className="input py-2"
                  value={row.endTime}
                  onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, endTime: event.target.value } : item)))}
                />
              </Field>
              <Field label="Slot">
                <select
                  className="input py-2"
                  value={row.slotMinutes}
                  onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, slotMinutes: Number(event.target.value) } : item)))}
                >
                  {[10, 15, 20, 30, 45].map((minutes) => (
                    <option key={minutes} value={minutes}>{minutes} min</option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                className="mb-0.5 rounded-lg p-2 text-muted hover:bg-clay-50 hover:text-clay-500"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
                title="Remove"
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-outline btn-sm"
            onClick={() => setRows([...rows, { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', slotMinutes: 20 }])}
          >
            <Icon name="plus" className="h-3.5 w-3.5" /> Add a session
          </button>
          <p className="text-xs text-muted">
            Saving replaces the doctor's whole week. Existing appointments are never deleted, but new bookings
            must fall inside these blocks.
          </p>
        </form>
      </Modal>

      <Modal
        open={Boolean(blockDoctor)}
        onClose={() => setBlockDoctor(null)}
        title={blockDoctor ? `Time off · Dr. ${blockDoctor.name}` : 'Time off'}
        subtitle="Blocked periods disappear from the booking calendar."
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setBlockDoctor(null)}>Cancel</button>
            <button type="submit" form="block-form" className="btn-primary" disabled={saving}>
              {saving ? <Spinner /> : <Icon name="check" className="h-4 w-4" />} Add block
            </button>
          </>
        }
      >
        <form id="block-form" onSubmit={addBlock} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Starts">
              <input
                type="datetime-local"
                className="input"
                value={block.startAt}
                onChange={(event) => setBlock({ ...block, startAt: event.target.value })}
                required
              />
            </Field>
            <Field label="Ends">
              <input
                type="datetime-local"
                className="input"
                value={block.endAt}
                onChange={(event) => setBlock({ ...block, endAt: event.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Reason">
            <input
              className="input"
              value={block.reason}
              onChange={(event) => setBlock({ ...block, reason: event.target.value })}
              placeholder="e.g. CME conference"
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
