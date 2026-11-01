import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  CANCELLATION_TYPES,
  EVENT_LABELS,
  NOTIFICATION_TYPE,
  ORIGIN_LABELS,
  REMINDER_STATUS,
  dayLabel,
  minutesLabel,
  timeLabel,
  todayIso,
} from '../lib/format'
import { Avatar, Drawer, ErrorBanner, Field, Loading, StatusChip, useToast } from './ui'
import Icon from './Icon'
import SlotPicker from './SlotPicker'

export default function AppointmentDrawer({ appointmentId, open, onClose, onChanged }) {
  const { user } = useAuth()
  const toast = useToast()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('view')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [doctors, setDoctors] = useState([])
  const [reschedule, setReschedule] = useState({ date: todayIso(), doctorId: '', slot: '' })
  const [cancel, setCancel] = useState({ cancellationType: 'PATIENT_LATE', reason: '' })

  const canManage = user?.role === 'OWNER' || user?.role === 'RECEPTIONIST'

  useEffect(() => {
    if (!open || !appointmentId) return
    let active = true
    setLoading(true)
    setMode('view')
    setError('')
    api.doctors().then(setDoctors).catch(() => {})
    api
      .appointment(appointmentId)
      .then((data) => {
        if (!active) return
        setDetail(data)
        setReschedule({
          date: data.startAt.slice(0, 10),
          doctorId: String(data.doctor.id),
          slot: data.startAt,
        })
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [open, appointmentId])

  async function run(action, message) {
    setSaving(true)
    setError('')
    try {
      const updated = await action()
      if (updated) setDetail(updated)
      toast(message, 'success')
      setMode('view')
      onChanged?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const appointment = detail
  const started = appointment ? new Date(appointment.startAt) <= new Date() : false
  const terminal = appointment ? ['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status) : false
  const cancellable = appointment && !terminal && canManage
  const rescheduledTarget = reschedule.slot

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={appointment ? appointment.patient.name : 'Appointment'}
      subtitle={appointment ? `${ORIGIN_LABELS[appointment.origin] || appointment.origin} booking` : undefined}
      footer={
        appointment && (
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Appointment #{appointment.id}</span>
            {appointment.recovered && (
              <span className="chip bg-teal-50 text-teal-700">
                <Icon name="sparkles" className="h-3 w-3" /> Recovered slot
              </span>
            )}
          </div>
        )
      }
    >
      {loading && <Loading label="Loading appointment" />}
      {!loading && !appointment && <ErrorBanner message={error || 'Appointment not found.'} />}
      {!loading && appointment && (
        <div className="space-y-5">
          {error && <ErrorBanner message={error} />}

          <div className="flex items-start gap-3">
            <Avatar name={appointment.patient.name} className="h-11 w-11 text-sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-navy-900">{appointment.patient.name}</p>
                <StatusChip status={appointment.status} />
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                <Icon name="phone" className="h-3 w-3" /> {appointment.patient.phone}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-sand-200 bg-sand-50 p-3 text-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">When</p>
              <p className="mt-1 font-medium text-navy-900">{dayLabel(appointment.startAt)}</p>
              <p className="text-xs text-muted">
                {timeLabel(appointment.startAt)} – {timeLabel(appointment.endAt)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Doctor</p>
              <p className="mt-1 font-medium text-navy-900">Dr. {appointment.doctor.name}</p>
              <p className="text-xs text-muted">{appointment.doctor.specialty}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Confirmation</p>
              <p className={`mt-1 font-medium ${appointment.confirmed ? 'text-teal-700' : 'text-amber-600'}`}>
                {appointment.confirmed ? 'Patient confirmed' : 'Awaiting confirmation'}
              </p>
              <p className="text-xs text-muted">{appointment.reason || 'Consultation'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Slot</p>
              <p className="mt-1 font-medium text-navy-900">
                {minutesLabel(
                  Math.round((new Date(appointment.endAt) - new Date(appointment.startAt)) / 60000),
                )}
              </p>
              <p className="text-xs text-muted">{appointment.confirmed ? 'Confirmed' : 'Unconfirmed'}</p>
            </div>
          </div>

          {appointment.status === 'CANCELLED' && (
            <div className="rounded-xl border border-sand-200 bg-sand-50 p-3 text-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Cancellation</p>
              <p className="mt-1 font-medium text-navy-900">
                {CANCELLATION_TYPES[appointment.cancellationType]?.label || 'Cancelled'}
              </p>
              <p className="text-xs text-muted">
                {appointment.cancelledBy} · {appointment.cancellationReason || 'No reason recorded'}
              </p>
            </div>
          )}

          {mode === 'view' && (
            <div className="grid grid-cols-2 gap-2">
              {!terminal && appointment.status === 'SCHEDULED' && (
                <button
                  type="button"
                  className="btn-outline"
                  disabled={saving}
                  onClick={() => run(() => api.confirmAppointment(appointment.id), 'Visit marked as confirmed')}
                >
                  <Icon name="check" className="h-4 w-4" /> Confirm visit
                </button>
              )}
              {!terminal && started && (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving}
                  onClick={() =>
                    run(
                      () => api.updateStatus(appointment.id, { status: 'COMPLETED' }),
                      'Attendance recorded',
                    )
                  }
                >
                  <Icon name="check" className="h-4 w-4" /> Mark attended
                </button>
              )}
              {!terminal && started && (
                <button
                  type="button"
                  className="btn-danger"
                  disabled={saving}
                  onClick={() =>
                    run(() => api.updateStatus(appointment.id, { status: 'NO_SHOW' }), 'No-show recorded')
                  }
                >
                  <Icon name="alert" className="h-4 w-4" /> No-show
                </button>
              )}
              {!terminal && canManage && (
                <button type="button" className="btn-outline" onClick={() => setMode('reschedule')}>
                  <Icon name="refresh" className="h-4 w-4" /> Reschedule
                </button>
              )}
              {!terminal && canManage && (
                <button type="button" className="btn-outline" onClick={() => setMode('cancel')}>
                  <Icon name="x" className="h-4 w-4" /> Cancel visit
                </button>
              )}
              {!terminal && (
                <button
                  type="button"
                  className="btn-outline col-span-2"
                  disabled={saving}
                  onClick={() => run(() => api.sendReminder(appointment.id), 'Reminder sent now')}
                >
                  <Icon name="send" className="h-4 w-4" /> Send a reminder now
                </button>
              )}
              {terminal && (
                <p className="col-span-2 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2.5 text-xs text-muted">
                  This visit is closed. Booking history and reminder records stay available below.
                </p>
              )}
            </div>
          )}

          {mode === 'reschedule' && (
            <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-navy-900">Move this appointment</p>
                <button type="button" className="text-xs text-muted hover:text-navy-900" onClick={() => setMode('view')}>
                  Close
                </button>
              </div>
              <Field label="Doctor">
                <select
                  className="input"
                  value={reschedule.doctorId}
                  onChange={(event) =>
                    setReschedule((current) => ({ ...current, doctorId: event.target.value, slot: '' }))
                  }
                >
                  {doctors
                    .filter((doctor) => doctor.active || doctor.id === appointment.doctor.id)
                    .map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name} · {doctor.specialty}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="New date">
                <input
                  type="date"
                  className="input"
                  value={reschedule.date}
                  min={todayIso()}
                  onChange={(event) =>
                    setReschedule((current) => ({ ...current, date: event.target.value, slot: '' }))
                  }
                />
              </Field>
              <span className="label">New time</span>
              <SlotPicker
                doctorId={reschedule.doctorId}
                date={reschedule.date}
                value={reschedule.slot}
                onChange={(slot) => setReschedule((current) => ({ ...current, slot }))}
              />
              <button
                type="button"
                className="btn-primary w-full"
                disabled={saving || !rescheduledTarget}
                onClick={() =>
                  run(
                    () =>
                      api.reschedule(appointment.id, {
                        startAt: reschedule.slot,
                        doctorId: Number(reschedule.doctorId),
                      }),
                    'Appointment moved and reminders rescheduled',
                  )
                }
              >
                <Icon name="check" className="h-4 w-4" /> Confirm new time
              </button>
            </div>
          )}

          {mode === 'cancel' && (
            <div className="space-y-3 rounded-xl border border-clay-100 bg-clay-50/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-navy-900">Cancel this appointment</p>
                <button type="button" className="text-xs text-muted hover:text-navy-900" onClick={() => setMode('view')}>
                  Close
                </button>
              </div>
              <p className="text-xs text-muted">
                Recording the reason keeps the recovery report honest — only patient cancellations count as recoverable.
              </p>
              <Field label="Who cancelled?">
                <select
                  className="input"
                  value={cancel.cancellationType}
                  onChange={(event) => setCancel((current) => ({ ...current, cancellationType: event.target.value }))}
                >
                  {Object.entries(CANCELLATION_TYPES).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Note (optional)">
                <input
                  className="input"
                  value={cancel.reason}
                  onChange={(event) => setCancel((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="e.g. Patient has a work conflict"
                />
              </Field>
              <button
                type="button"
                className="btn-danger w-full"
                disabled={saving}
                onClick={() =>
                  run(
                    () => api.cancelAppointment(appointment.id, cancel),
                    'Appointment cancelled — the slot is now in the recovery queue',
                  )
                }
              >
                <Icon name="x" className="h-4 w-4" /> Cancel appointment
              </button>
            </div>
          )}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Reminder trail
            </p>
            {appointment.notifications.length === 0 && (
              <p className="rounded-lg border border-dashed border-sand-300 px-3 py-3 text-xs text-muted">
                No messages have been queued for this appointment.
              </p>
            )}
            <ul className="space-y-2">
              {appointment.notifications.map((notification) => (
                <li key={notification.id} className="flex items-start gap-2.5 rounded-lg border border-sand-200 px-3 py-2">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-sand-100 text-teal-700">
                    <Icon name={notification.channel === 'EMAIL' ? 'mail' : 'message'} className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-navy-900">
                      {NOTIFICATION_TYPE[notification.type] || notification.type}
                    </p>
                    <p className="text-[11px] text-muted">
                      {notification.status === 'SENT'
                        ? `Delivered ${dayLabel(notification.sentAt)} at ${timeLabel(notification.sentAt)}`
                        : `Scheduled ${dayLabel(notification.scheduledAt)} at ${timeLabel(notification.scheduledAt)}`}
                      {' · '}
                      {notification.channel.toLowerCase()}
                    </p>
                  </div>
                  <span className={`chip ${REMINDER_STATUS[notification.status]?.chip || 'bg-sand-200 text-navy-700'}`}>
                    {REMINDER_STATUS[notification.status]?.label || notification.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">History</p>
            <ol className="space-y-2 border-l border-sand-200 pl-3">
              {appointment.events.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-teal-400 ring-2 ring-white" />
                  <p className="text-xs font-medium text-navy-900">{EVENT_LABELS[event.type] || event.type}</p>
                  <p className="text-[11px] text-muted">
                    {dayLabel(event.occurredAt)} · {timeLabel(event.occurredAt)}
                    {event.actor ? ` · ${event.actor}` : ''}
                  </p>
                  {event.note && <p className="text-[11px] text-sand-400">{event.note}</p>}
                </li>
              ))}
              {appointment.events.length === 0 && <p className="text-xs text-muted">No history recorded yet.</p>}
            </ol>
          </div>
        </div>
      )}
    </Drawer>
  )
}
