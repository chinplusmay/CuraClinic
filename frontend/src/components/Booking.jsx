import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { Avatar, ErrorBanner, Field, Modal, Spinner, useToast } from './ui'
import SlotPicker from './SlotPicker'
import Icon from './Icon'
import { addDaysIso, isoDate, timeLabel, todayIso } from '../lib/format'

const BookingContext = createContext(null)

export function useBooking() {
  const context = useContext(BookingContext)
  if (!context) throw new Error('useBooking must be used inside BookingProvider')
  return context
}

export function BookingProvider({ children }) {
  const [request, setRequest] = useState(null)
  const toast = useToast()

  const openBooking = useCallback((options = {}) => {
    setRequest({ ...options, key: Date.now() })
  }, [])

  const handleBooked = useCallback(
    (appointment) => {
      toast(`${appointment.patient.name} booked for ${timeLabel(appointment.startAt)}`, 'success')
      request?.onBooked?.(appointment)
      setRequest(null)
    },
    [request, toast],
  )

  return (
    <BookingContext.Provider value={{ openBooking }}>
      {children}
      <BookingDialog
        open={Boolean(request)}
        initial={request}
        onClose={() => setRequest(null)}
        onBooked={handleBooked}
      />
    </BookingContext.Provider>
  )
}

function BookingDialog({ open, initial, onClose, onBooked }) {
  const [doctors, setDoctors] = useState([])
  const [patientQuery, setPatientQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [slot, setSlot] = useState('')
  const [reason, setReason] = useState('Consultation')
  const [origin, setOrigin] = useState('PHONE')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', email: '' })

  useEffect(() => {
    if (!open) return
    setSelectedPatient(initial?.patient || null)
    setPatientQuery(initial?.patient?.name || '')
    setDoctorId(initial?.doctorId ? String(initial.doctorId) : '')
    setDate(initial?.date || (initial?.startAt ? initial.startAt.slice(0, 10) : todayIso()))
    setSlot(initial?.startAt || '')
    setReason(initial?.reason || 'Consultation')
    setOrigin('PHONE')
    setError('')
    setShowNewPatient(false)
    setNewPatient({ name: '', phone: '', email: '' })
    setResults([])
    api.doctors().then(setDoctors).catch((err) => setError(err.message))
  }, [open, initial])

  useEffect(() => {
    if (!open || selectedPatient) return undefined
    const query = patientQuery.trim()
    if (query.length < 2) {
      setResults([])
      return undefined
    }
    setSearching(true)
    const timer = setTimeout(() => {
      api
        .patients(query)
        .then((data) => setResults(data.slice(0, 6)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [patientQuery, open, selectedPatient])

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => String(doctor.id) === String(doctorId)),
    [doctors, doctorId],
  )

  async function createPatient() {
    if (!newPatient.name.trim() || !newPatient.phone.trim()) {
      setError('A patient needs at least a name and phone number.')
      return
    }
    try {
      const patient = await api.createPatient(newPatient)
      setSelectedPatient(patient)
      setPatientQuery(patient.name)
      setShowNewPatient(false)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (!selectedPatient) {
      setError('Choose an existing patient or add a new one.')
      return
    }
    if (!doctorId || !slot) {
      setError('Pick a doctor and an open time.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const appointment = await api.book({
        patientId: selectedPatient.id,
        doctorId: Number(doctorId),
        startAt: slot,
        reason,
        origin,
      })
      onBooked(appointment)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Book an appointment"
      subtitle="Reception booking with live availability checks"
      size="lg"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="booking-form" className="btn-primary" disabled={saving}>
            {saving ? <Spinner /> : <Icon name="check" className="h-4 w-4" />}
            Book appointment
          </button>
        </>
      }
    >
      <form id="booking-form" onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <div className="space-y-2">
          <span className="label">Patient</span>
          {selectedPatient ? (
            <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm">
                <Avatar name={selectedPatient.name} className="h-8 w-8 text-[11px]" />
                <span>
                  <span className="block font-semibold text-navy-900">{selectedPatient.name}</span>
                  <span className="block text-xs text-muted">{selectedPatient.phone}</span>
                </span>
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-teal-700 underline-offset-2 hover:underline"
                onClick={() => {
                  setSelectedPatient(null)
                  setPatientQuery('')
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-sand-400" />
              <input
                className="input pl-9"
                placeholder="Search by name, phone or email"
                value={patientQuery}
                onChange={(event) => setPatientQuery(event.target.value)}
                autoComplete="off"
              />
              {searching && <Spinner className="absolute right-3 top-3 h-4 w-4 text-teal-600" />}
              {(results.length > 0 || patientQuery.trim().length >= 2) && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-sand-200 bg-white shadow-lift">
                  {results.map((patient) => (
                    <button
                      type="button"
                      key={patient.id}
                      onClick={() => {
                        setSelectedPatient(patient)
                        setPatientQuery(patient.name)
                        setResults([])
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-sand-100"
                    >
                      <Avatar name={patient.name} className="h-7 w-7 text-[10px]" />
                      <span>
                        <span className="block font-medium text-navy-900">{patient.name}</span>
                        <span className="block text-xs text-muted">{patient.phone}</span>
                      </span>
                    </button>
                  ))}
                  {!searching && results.length === 0 && (
                    <div className="px-3 py-2.5 text-xs text-muted">
                      No match. Add this patient to the directory below.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNewPatient(true)}
                    className="flex w-full items-center gap-2 border-t border-sand-200 bg-sand-50 px-3 py-2.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                  >
                    <Icon name="plus" className="h-3.5 w-3.5" /> Add a new patient
                  </button>
                </div>
              )}
            </div>
          )}

          {(showNewPatient || (!selectedPatient && patientQuery.trim().length >= 2 && results.length === 0)) && (
            <div className="grid gap-2 rounded-xl border border-sand-200 bg-sand-50 p-3 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
              <input
                className="input"
                placeholder="Full name"
                value={newPatient.name}
                onChange={(event) => setNewPatient({ ...newPatient, name: event.target.value })}
              />
              <input
                className="input"
                placeholder="Phone"
                value={newPatient.phone}
                onChange={(event) => setNewPatient({ ...newPatient, phone: event.target.value })}
              />
              <input
                className="input"
                placeholder="Email (optional)"
                value={newPatient.email}
                onChange={(event) => setNewPatient({ ...newPatient, email: event.target.value })}
              />
              <button type="button" className="btn-outline" onClick={createPatient}>
                Add
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Doctor">
            <select className="input" value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
              <option value="">Select a doctor</option>
              {doctors
                .filter((doctor) => doctor.active)
                .map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} · {doctor.specialty}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              className="input"
              min={todayIso()}
              max={addDaysIso(todayIso(), 90)}
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                setSlot('')
              }}
            />
          </Field>
        </div>

        <div>
          <span className="label">Available times {selectedDoctor ? `· ${selectedDoctor.name}` : ''}</span>
          <SlotPicker doctorId={doctorId} date={date} value={slot} onChange={setSlot} />
        </div>

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Reason / notes">
            <input className="input" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={255} />
          </Field>
          <Field label="Booking channel">
            <select className="input" value={origin} onChange={(event) => setOrigin(event.target.value)}>
              <option value="PHONE">Phone</option>
              <option value="STAFF">Walk-in / reception</option>
              <option value="ONLINE">Online</option>
            </select>
          </Field>
        </div>
        {slot && (
          <div className="rounded-xl bg-navy-900 px-4 py-3 text-sm text-white">
            <p className="flex items-center gap-2 font-medium">
              <Icon name="calendar" className="h-4 w-4 text-teal-300" />
              {date === todayIso() ? 'Today' : isoDate(date)} at {timeLabel(slot)}
              {selectedDoctor ? ` · ${selectedDoctor.name}` : ''}
            </p>
            <p className="mt-0.5 text-xs text-teal-100/70">
              A confirmation message is queued and 24-hour / 2-hour reminders are scheduled automatically.
            </p>
          </div>
        )}
      </form>
    </Modal>
  )
}
