import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useBooking } from '../components/Booking'
import AppointmentDrawer from '../components/AppointmentDrawer'
import { Empty, ErrorBanner, Loading, StatusChip } from '../components/ui'
import Icon from '../components/Icon'
import {
  addDaysIso,
  dayLabel,
  longDayLabel,
  relativeDayLabel,
  timeLabel,
  todayIso,
} from '../lib/format'

const cellTone = {
  SCHEDULED: 'border-amber-300 bg-amber-100/60 hover:bg-amber-100',
  CONFIRMED: 'border-teal-300 bg-teal-50 hover:bg-teal-100',
  COMPLETED: 'border-teal-400 bg-teal-100 hover:bg-teal-200/70',
  NO_SHOW: 'border-clay-400 bg-clay-50 hover:bg-clay-100',
}

export default function CalendarPage() {
  const [date, setDate] = useState(todayIso())
  const [availability, setAvailability] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drawerId, setDrawerId] = useState(null)
  const { openBooking } = useBooking()

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const [day, list] = await Promise.all([
          api.availability(date),
          api.appointments({ from: date, to: date }),
        ])
        setAvailability(day)
        setAppointments(list)
        setError('')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [date],
  )

  useEffect(() => {
    load()
  }, [load])

  const schedule = useMemo(() => {
    if (!availability) return { times: [], columns: [] }
    const timeSet = new Set()
    const columns = availability.doctors.map((doctor) => {
      const slots = new Map()
      doctor.slots.forEach((slot) => {
        timeSet.add(slot.startAt)
        slots.set(slot.startAt, slot)
      })
      return { ...doctor, slotMap: slots }
    })
    const times = [...timeSet].sort()
    const byKey = new Map()
    appointments
      .filter((appointment) => appointment.status !== 'CANCELLED')
      .forEach((appointment) => {
        byKey.set(`${appointment.doctor.id}|${appointment.startAt}`, appointment)
      })
    return { times, columns, byKey }
  }, [availability, appointments])

  const openSlots = availability
    ? availability.doctors.reduce((total, doctor) => total + doctor.slots.filter((slot) => slot.available).length, 0)
    : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">{longDayLabel(date)}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {relativeDayLabel(date)} · {openSlots} open slots across {availability?.doctors.length ?? 0} doctors
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-outline btn-sm" onClick={() => setDate(addDaysIso(date, -1))}>
            <Icon name="chevron-left" className="h-3.5 w-3.5" /> Prev
          </button>
          <button type="button" className="btn-outline btn-sm" onClick={() => setDate(todayIso())}>
            Today
          </button>
          <button type="button" className="btn-outline btn-sm" onClick={() => setDate(addDaysIso(date, 1))}>
            Next <Icon name="chevron-right" className="h-3.5 w-3.5" />
          </button>
          <input
            type="date"
            className="input w-auto py-2 text-xs"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-teal-300 bg-teal-50" /> Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-100" /> Awaiting confirmation</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-teal-400 bg-teal-100" /> Attended</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-clay-400 bg-clay-50" /> No-show</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-teal-400 bg-white" /> Open — click to book</span>
        <span className="ml-auto hidden items-center gap-1.5 sm:flex"><Icon name="clock" className="h-3.5 w-3.5" /> Times are clinic local</span>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && !availability ? (
        <Loading label="Building the day's schedule" />
      ) : !availability || schedule.columns.length === 0 ? (
        <div className="card">
          <Empty
            icon="calendar"
            title="No doctors are working"
            hint={`${dayLabel(date)} has no active working hours configured.`}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-thin max-h-[calc(100vh-280px)] overflow-auto">
            <div
              className="grid min-w-[760px]"
              style={{ gridTemplateColumns: `76px repeat(${schedule.columns.length}, minmax(210px, 1fr))` }}
            >
              <div className="sticky left-0 top-0 z-20 border-b border-r border-sand-200 bg-sand-50 px-2 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
                Time
              </div>
              {schedule.columns.map((doctor) => (
                <div key={doctor.doctorId} className="sticky top-0 z-10 border-b border-sand-200 bg-sand-50 px-3 py-2.5">
                  <p className="text-sm font-semibold text-navy-900">Dr. {doctor.doctorName}</p>
                  <p className="text-[11px] text-muted">{doctor.specialty}</p>
                </div>
              ))}

              {schedule.times.map((time) => {
                const isHour = new Date(time).getMinutes() === 0
                return (
                  <div key={time} className="contents">
                    <div
                      className={`sticky left-0 z-10 min-h-[42px] border-r border-sand-200 bg-white px-2 py-1 text-right text-[10px] ${
                        isHour ? 'border-t border-sand-200 font-semibold text-navy-800' : 'text-sand-400'
                      }`}
                    >
                      {isHour ? timeLabel(time) : ''}
                    </div>
                    {schedule.columns.map((doctor) => {
                      const slot = doctor.slotMap.get(time)
                      const appointment = schedule.byKey.get(`${doctor.doctorId}|${time}`)
                      if (!slot) {
                        return (
                          <div
                            key={`${doctor.doctorId}-${time}`}
                            className="min-h-[42px] border-l border-sand-100 px-1 py-1 text-center text-[10px] text-sand-300"
                          >
                            ·
                          </div>
                        )
                      }
                      if (appointment) {
                        return (
                          <button
                            type="button"
                            key={`${doctor.doctorId}-${time}`}
                            onClick={() => setDrawerId(appointment.id)}
                            className={`m-0.5 flex min-h-[42px] flex-col items-start gap-0.5 rounded-lg border px-2 py-1.5 text-left transition ${
                              cellTone[appointment.status] || 'border-sand-300 bg-sand-100'
                            }`}
                          >
                            <span className="flex w-full items-center justify-between gap-1">
                              <span className="truncate text-[11px] font-semibold text-navy-900">
                                {appointment.patient.name}
                              </span>
                              {appointment.recovered && <Icon name="sparkles" className="h-3 w-3 shrink-0 text-teal-700" />}
                            </span>
                            <span className="text-[10px] text-navy-700/80">
                              {timeLabel(appointment.startAt)} · {appointment.status === 'SCHEDULED' && !appointment.confirmed ? 'Unconfirmed' : appointment.status.toLowerCase()}
                            </span>
                          </button>
                        )
                      }
                      if (slot.available) {
                        return (
                          <button
                            type="button"
                            key={`${doctor.doctorId}-${time}`}
                            onClick={() =>
                              openBooking({
                                date,
                                doctorId: doctor.doctorId,
                                startAt: slot.startAt,
                                onBooked: () => load(true),
                              })
                            }
                            className="group m-0.5 flex min-h-[42px] items-center justify-center rounded-lg border border-dashed border-sand-300 text-[10px] font-medium text-sand-400 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
                          >
                            <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                              <Icon name="plus" className="h-3 w-3" /> Book
                            </span>
                          </button>
                        )
                      }
                      if (slot.state === 'PAST') {
                        return (
                          <div
                            key={`${doctor.doctorId}-${time}`}
                            className="m-0.5 flex min-h-[42px] items-center justify-center rounded-lg bg-sand-50/60 text-[9px] text-sand-300"
                          >
                            —
                          </div>
                        )
                      }
                      return (
                        <div
                          key={`${doctor.doctorId}-${time}`}
                          className="m-0.5 flex min-h-[42px] items-center justify-center rounded-lg border border-sand-200 bg-sand-100 text-[9px] font-medium uppercase tracking-wide text-sand-400"
                        >
                          {slot.state === 'BOOKED' ? 'Taken' : 'Blocked'}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <p>
          {appointments.filter((item) => item.status !== 'CANCELLED').length} visits on the books ·{' '}
          {appointments.filter((item) => !item.confirmed && item.status !== 'CANCELLED').length} awaiting confirmation
        </p>
        <p className="flex items-center gap-2">
          <StatusChip status="CONFIRMED" /> confirmed visits send reminders automatically
        </p>
      </div>

      <AppointmentDrawer
        appointmentId={drawerId}
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
        onChanged={() => load(true)}
      />
    </div>
  )
}
