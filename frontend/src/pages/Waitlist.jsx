import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import {
  Avatar,
  Empty,
  ErrorBanner,
  Field,
  Loading,
  Modal,
  Spinner,
  StatCard,
  useToast,
} from '../components/ui'
import Icon from '../components/Icon'
import {
  CANCELLATION_TYPES,
  addDaysIso,
  dayLabel,
  relativeDayLabel,
  timeLabel,
  todayIso,
} from '../lib/format'

const emptyEntry = {
  patient: null,
  doctorId: '',
  preferredFrom: todayIso(),
  preferredTo: addDaysIso(todayIso(), 14),
  preferredTimeOfDay: 'ANY',
  notes: '',
}

function PatientPicker({ value, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (value) return undefined
    if (query.trim().length < 2) {
      setResults([])
      return undefined
    }
    setSearching(true)
    const timer = setTimeout(() => {
      api
        .patients(query)
        .then((data) => setResults(data.slice(0, 5)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query, value])

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm">
          <Avatar name={value.name} className="h-8 w-8 text-[11px]" />
          <span>
            <span className="block font-semibold text-navy-900">{value.name}</span>
            <span className="block text-xs text-muted">{value.phone}</span>
          </span>
        </span>
        <button type="button" className="text-xs font-semibold text-teal-700 hover:underline" onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-sand-400" />
      <input
        className="input pl-9"
        placeholder="Search patient by name or phone"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {searching && <Spinner className="absolute right-3 top-3 h-4 w-4 text-teal-600" />}
      {results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-sand-200 bg-white shadow-lift">
          {results.map((patient) => (
            <button
              type="button"
              key={patient.id}
              onClick={() => {
                onChange(patient)
                setQuery(patient.name)
                setResults([])
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-sand-100"
            >
              <Avatar name={patient.name} className="h-7 w-7 text-[10px]" />
              <span>
                <span className="block font-medium text-navy-900">{patient.name}</span>
                <span className="block text-xs text-muted">{patient.phone}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Waitlist() {
  const [entries, setEntries] = useState([])
  const [recovery, setRecovery] = useState({ openSlots: [], waitingPatients: 0 })
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(emptyEntry)
  const [saving, setSaving] = useState(false)
  const [offerEntry, setOfferEntry] = useState(null)
  const [busySlot, setBusySlot] = useState(null)
  const toast = useToast()

  const load = useCallback(async () => {
    try {
      const [list, queue] = await Promise.all([api.waitlist(), api.recovery(todayIso(), addDaysIso(todayIso(), 14))])
      setEntries(list)
      setRecovery(queue)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    api.doctors().then(setDoctors).catch(() => {})
  }, [load])

  const waiting = useMemo(() => entries.filter((entry) => entry.status === 'WAITING' || entry.status === 'OFFERED'), [entries])
  const filled = useMemo(() => entries.filter((entry) => entry.status === 'BOOKED').length, [entries])

  async function addEntry(event) {
    event.preventDefault()
    if (!form.patient) {
      toast('Choose a patient first', 'error')
      return
    }
    setSaving(true)
    try {
      await api.addWaitlist({
        patientId: form.patient.id,
        doctorId: form.doctorId || null,
        preferredFrom: form.preferredFrom || null,
        preferredTo: form.preferredTo || null,
        preferredTimeOfDay: form.preferredTimeOfDay,
        notes: form.notes,
      })
      toast(`${form.patient.name} added to the waitlist`, 'success')
      setAddOpen(false)
      setForm(emptyEntry)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function cancelEntry(entry) {
    try {
      await api.cancelWaitlist(entry.id)
      toast('Removed from the waitlist', 'success')
      load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function bookSlot(entry, slot) {
    setBusySlot(`${entry.id}-${slot.cancelledAppointmentId}`)
    try {
      await api.offerSlot(entry.id, {
        startAt: slot.startAt,
        doctorId: slot.doctor.id,
        cancelledAppointmentId: slot.cancelledAppointmentId,
      })
      toast(`${entry.patient.name} booked for ${timeLabel(slot.startAt)} — recovered slot`, 'success')
      setOfferEntry(null)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusySlot(null)
    }
  }

  const slotsForEntry = (entry) =>
    recovery.openSlots.filter((slot) => slot.matches.some((match) => match.id === entry.id))

  if (loading) return <Loading label="Loading the waitlist" />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">Waitlist & recovery</h2>
          <p className="mt-0.5 text-sm text-muted">
            Freed slots stay on this board until they are filled — or counted as lost.
          </p>
        </div>
        <button type="button" className="btn-primary btn-sm" onClick={() => setAddOpen(true)}>
          <Icon name="plus" className="h-4 w-4" /> Add to waitlist
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Open recovered slots" value={recovery.openSlots.length} hint="Cancelled slots still unfilled" tone={recovery.openSlots.length ? 'amber' : 'default'} icon="clock" />
        <StatCard label="Patients waiting" value={recovery.waitingPatients} hint="Ordered by when they joined" icon="users" />
        <StatCard label="Slots filled from waitlist" value={filled} hint="Bookings attributed to recovery" tone="teal" icon="sparkles" />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-navy-900">Recovery board</h3>
            <p className="text-xs text-muted">Freed by a cancellation in the next two weeks</p>
          </div>
          <span className="chip bg-sand-200 text-navy-700">next 14 days</span>
        </div>

        {recovery.openSlots.length === 0 ? (
          <div className="card">
            <Empty
              icon="sparkles"
              title="Every cancelled slot is filled"
              hint="When a patient cancels, the freed slot appears here with matching waitlist patients."
            />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recovery.openSlots.map((slot) => (
              <article key={slot.cancelledAppointmentId} className="card flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                      {relativeDayLabel(slot.startAt.slice(0, 10))} · {timeLabel(slot.startAt)}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-navy-900">Dr. {slot.doctor.name}</p>
                    <p className="text-[11px] text-muted">
                      {CANCELLATION_TYPES[slot.cancellationType]?.label || 'Cancelled'} · was {slot.cancelledPatient.name}
                    </p>
                  </div>
                  <span className={`chip ${slot.matches.length ? 'bg-teal-50 text-teal-700' : 'bg-sand-200 text-navy-700'}`}>
                    {slot.matches.length} match{slot.matches.length === 1 ? '' : 'es'}
                  </span>
                </div>

                <div className="mt-3 flex-1 space-y-1.5">
                  {slot.matches.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-sand-300 px-2.5 py-2 text-[11px] text-muted">
                      No waitlist patient fits this time. Call a recent patient to offer it directly.
                    </p>
                  ) : (
                    slot.matches.slice(0, 3).map((match) => (
                      <div key={match.id} className="flex items-center gap-2 rounded-lg bg-sand-50 px-2 py-1.5">
                        <Avatar name={match.patient.name} className="h-7 w-7 text-[10px]" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-navy-900">{match.patient.name}</p>
                          <p className="text-[10px] text-muted">prefers {match.preferredTimeOfDay.toLowerCase()}</p>
                        </div>
                        <button
                          type="button"
                          className="btn-outline btn-sm"
                          disabled={Boolean(busySlot)}
                          onClick={() => bookSlot(match, slot)}
                        >
                          {busySlot === `${match.id}-${slot.cancelledAppointmentId}` ? <Spinner /> : 'Offer'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
                {slot.matches.length > 3 && (
                  <p className="mt-2 text-[10px] text-muted">+{slot.matches.length - 3} more matching patients</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-sand-200 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-navy-900">Waiting patients</h3>
            <p className="text-xs text-muted">First come, first offered</p>
          </div>
          <span className="chip bg-sand-200 text-navy-700">{waiting.length} waiting</span>
        </div>
        {waiting.length === 0 ? (
          <Empty
            icon="users"
            title="Nobody is waiting"
            hint="Add patients who want an earlier appointment, and they will be matched against cancellations."
            action={<button type="button" className="btn-primary btn-sm" onClick={() => setAddOpen(true)}>Add to waitlist</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse">
              <thead>
                <tr>
                  <th className="table-head">Patient</th>
                  <th className="table-head">Preference</th>
                  <th className="table-head">Window</th>
                  <th className="table-head">Matches</th>
                  <th className="table-head">Added</th>
                  <th className="table-head" />
                </tr>
              </thead>
              <tbody>
                {waiting.map((entry) => (
                  <tr key={entry.id} className="transition hover:bg-sand-50">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Avatar name={entry.patient.name} className="h-8 w-8 text-[10px]" />
                        <div>
                          <p className="font-medium text-navy-900">{entry.patient.name}</p>
                          <p className="text-[11px] text-muted">{entry.patient.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-xs">
                      <p className="text-navy-900">{entry.doctor ? `Dr. ${entry.doctor.name}` : 'Any doctor'}</p>
                      <p className="text-muted">{entry.preferredTimeOfDay.toLowerCase()}</p>
                    </td>
                    <td className="table-cell text-xs text-muted">
                      {entry.preferredFrom || 'Any'} → {entry.preferredTo || 'Open'}
                    </td>
                    <td className="table-cell">
                      {entry.matchingOpenSlots > 0 ? (
                        <span className="chip bg-teal-50 text-teal-700">{entry.matchingOpenSlots} open</span>
                      ) : (
                        <span className="text-xs text-muted">none yet</span>
                      )}
                    </td>
                    <td className="table-cell text-xs text-muted">{dayLabel(entry.createdAt)}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="btn-outline btn-sm"
                          disabled={entry.matchingOpenSlots === 0}
                          onClick={() => setOfferEntry(entry)}
                        >
                          Offer
                        </button>
                        <button type="button" className="btn-ghost btn-sm" onClick={() => cancelEntry(entry)}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a patient to the waitlist"
        subtitle="They will be matched against every future cancellation that fits."
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="submit" form="waitlist-form" className="btn-primary" disabled={saving}>
              {saving ? <Spinner /> : <Icon name="plus" className="h-4 w-4" />} Add to waitlist
            </button>
          </>
        }
      >
        <form id="waitlist-form" onSubmit={addEntry} className="space-y-4">
          <div>
            <span className="label">Patient</span>
            <PatientPicker value={form.patient} onChange={(patient) => setForm({ ...form, patient })} />
            {!form.patient && (
              <p className="mt-1 text-[11px] text-muted">
                New patient? Add them from the Patients page first.
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preferred doctor">
              <select
                className="input"
                value={form.doctorId}
                onChange={(event) => setForm({ ...form, doctorId: event.target.value })}
              >
                <option value="">Any doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>Dr. {doctor.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Preferred time of day">
              <select
                className="input"
                value={form.preferredTimeOfDay}
                onChange={(event) => setForm({ ...form, preferredTimeOfDay: event.target.value })}
              >
                <option value="ANY">Any time</option>
                <option value="MORNING">Morning (before 12)</option>
                <option value="AFTERNOON">Afternoon (12–5)</option>
                <option value="EVENING">Evening (after 5)</option>
              </select>
            </Field>
            <Field label="Earliest date">
              <input
                type="date"
                className="input"
                value={form.preferredFrom}
                onChange={(event) => setForm({ ...form, preferredFrom: event.target.value })}
              />
            </Field>
            <Field label="Latest date">
              <input
                type="date"
                className="input"
                value={form.preferredTo}
                onChange={(event) => setForm({ ...form, preferredTo: event.target.value })}
              />
            </Field>
          </div>
          <Field label="Notes for reception">
            <input
              className="input"
              value={form.notes}
              placeholder="e.g. Can come in at short notice"
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(offerEntry)}
        onClose={() => setOfferEntry(null)}
        title={offerEntry ? `Offer a slot to ${offerEntry.patient.name}` : 'Offer a slot'}
        subtitle="Only slots that match this patient's waitlist preferences are shown."
      >
        {offerEntry && (
          <div className="space-y-2">
            {slotsForEntry(offerEntry).length === 0 ? (
              <ErrorBanner message="No matching open slots right now. Keep the patient on the waitlist." />
            ) : (
              slotsForEntry(offerEntry).map((slot) => (
                <div key={slot.cancelledAppointmentId} className="flex items-center justify-between gap-3 rounded-xl border border-sand-200 px-3 py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-navy-900">
                      {relativeDayLabel(slot.startAt.slice(0, 10))} · {timeLabel(slot.startAt)}
                    </p>
                    <p className="text-[11px] text-muted">
                      Dr. {slot.doctor.name} · freed by {slot.cancelledPatient.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={Boolean(busySlot)}
                    onClick={() => bookSlot(offerEntry, slot)}
                  >
                    {busySlot ? <Spinner /> : 'Book slot'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
