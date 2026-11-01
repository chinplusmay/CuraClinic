import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useBooking } from '../components/Booking'
import AppointmentDrawer from '../components/AppointmentDrawer'
import { Avatar, Empty, ErrorBanner, Loading, Modal, Segmented, StatCard, StatusChip, useToast } from '../components/ui'
import Icon from '../components/Icon'
import {
  addDaysIso,
  dayLabel,
  minutesLabel,
  percent,
  relativeDayLabel,
  timeLabel,
  todayIso,
} from '../lib/format'

const attentionTone = {
  UNCONFIRMED: 'bg-amber-100 text-amber-600',
  OPEN_SLOT: 'bg-teal-50 text-teal-700',
  NO_SHOW: 'bg-clay-100 text-clay-600',
  WAITLIST: 'bg-sand-200 text-navy-700',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [date, setDate] = useState(todayIso())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [drawerId, setDrawerId] = useState(null)
  const [offer, setOffer] = useState(null)
  const [offering, setOffering] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const { openBooking } = useBooking()

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const result = await api.dashboard(date)
        setData(result)
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

  const agenda = useMemo(() => {
    if (!data) return []
    if (filter === 'unconfirmed') return data.agenda.filter((item) => !item.confirmed)
    if (filter === 'remaining') return data.agenda.filter((item) => item.status !== 'COMPLETED' && item.status !== 'NO_SHOW')
    return data.agenda
  }, [data, filter])

  async function confirmAppointment(id) {
    try {
      await api.confirmAppointment(id)
      toast('Visit confirmed', 'success')
      load(true)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function offerSlot(match) {
    setOffering(true)
    try {
      await api.offerSlot(match.id, {
        startAt: offer.startAt,
        doctorId: offer.doctor.id,
        cancelledAppointmentId: offer.cancelledAppointmentId,
      })
      toast(`${match.patient.name} booked into the freed slot`, 'success')
      setOffer(null)
      load(true)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setOffering(false)
    }
  }

  if (loading && !data) return <Loading label="Loading the reception desk" />
  if (error && !data) return <ErrorBanner message={error} />

  const kpis = data.kpis
  const utilization = kpis.availableMinutesToday > 0 ? kpis.bookedMinutesToday / kpis.availableMinutesToday : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">
            {(() => {
              const hour = new Date().getHours()
              const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
              return `${greeting}, ${user?.name?.split(' ')[0] || 'there'}`
            })()}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {relativeDayLabel(date)} · {dayLabel(date)} — {kpis.todayTotal} visits on the books at {data.clinicName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-outline btn-sm" onClick={() => setDate(addDaysIso(date, -1))}>
            <Icon name="chevron-left" className="h-3.5 w-3.5" /> Prev
          </button>
          <button type="button" className="btn-outline btn-sm" onClick={() => setDate(todayIso())}>
            Today
          </button>
          <button type="button" className="btn-outline btn-sm" onClick={() => setDate(addDaysIso(date, 1))}>
            Next <Icon name="chevron-right" className="h-3.5 w-3.5" />
          </button>
          {date !== todayIso() && (
            <span className="chip bg-sand-200 text-navy-700">{dayLabel(date)}</span>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's appointments"
          value={kpis.todayTotal}
          hint={`${kpis.completed} attended · ${kpis.noShow} no-show · ${kpis.cancelled} cancelled`}
          icon="calendar"
        />
        <StatCard
          label="Awaiting confirmation"
          value={kpis.unconfirmed}
          hint={kpis.unconfirmed > 0 ? 'Send a reminder or call before the end of the day' : 'Every visit is confirmed'}
          tone={kpis.unconfirmed > 0 ? 'amber' : 'default'}
          icon="bell"
        />
        <StatCard
          label="Open slots today"
          value={kpis.openSlotsToday}
          hint={`${kpis.waitlistWaiting} patients waiting for an earlier slot`}
          tone={kpis.openSlotsToday > 0 ? 'teal' : 'default'}
          icon="clock"
        />
        <StatCard
          label="Recovered this month"
          value={kpis.recoveredThisMonth}
          hint="Cancelled slots filled from the waitlist"
          tone="navy"
          icon="sparkles"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-navy-900">Today’s agenda</h3>
              <p className="text-xs text-muted">Click a visit to confirm, check in or reschedule</p>
            </div>
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `All ${data.agenda.length}` },
                { value: 'unconfirmed', label: 'Unconfirmed' },
                { value: 'remaining', label: 'Remaining' },
              ]}
            />
          </div>

          {agenda.length === 0 ? (
            <Empty
              icon="calendar"
              title="Nothing on the books"
              hint="This day is empty. Book a visit or pick another date."
              action={
                <button type="button" className="btn-primary btn-sm" onClick={() => openBooking({ date, onBooked: () => load(true) })}>
                  <Icon name="plus" className="h-4 w-4" /> Book appointment
                </button>
              }
            />
          ) : (
            <ul className="scroll-thin max-h-[640px] divide-y divide-sand-100 overflow-y-auto">
              {agenda.map((appointment) => (
                <li key={appointment.id}>
                  <div className="group flex items-start gap-3 px-4 py-3 transition hover:bg-sand-50">
                    <div className="w-14 shrink-0 pt-0.5 text-right">
                      <p className="text-xs font-semibold text-navy-900">{timeLabel(appointment.startAt)}</p>
                      <p className="text-[10px] text-muted">
                        {minutesLabel(Math.round((new Date(appointment.endAt) - new Date(appointment.startAt)) / 60000))}
                      </p>
                    </div>
                    <button type="button" onClick={() => setDrawerId(appointment.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                      <Avatar name={appointment.patient.name} className="h-9 w-9 text-[11px]" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-navy-900">{appointment.patient.name}</span>
                          {appointment.recovered && (
                            <span className="chip bg-teal-50 px-1.5 py-0.5 text-[9px] text-teal-700">recovered</span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          Dr. {appointment.doctor.name} · {appointment.doctor.specialty}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusChip status={appointment.status} />
                      {!appointment.confirmed && appointment.status === 'SCHEDULED' && (
                        <button
                          type="button"
                          onClick={() => confirmAppointment(appointment.id)}
                          className="text-[10px] font-semibold text-teal-700 hover:underline"
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-sand-200 bg-sand-50 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>Booked capacity</span>
                <span className="font-semibold text-navy-800">
                  {minutesLabel(kpis.bookedMinutesToday)} / {minutesLabel(kpis.availableMinutesToday)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand-200">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, utilization * 100)}%` }} />
              </div>
            </div>
            <span className="chip bg-white text-navy-700">{percent(utilization)} used</span>
          </div>
        </section>

        <div className="space-y-5">
          <section className="card">
            <div className="flex items-center justify-between border-b border-sand-200 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-navy-900">Needs attention</h3>
                <p className="text-xs text-muted">Worked top to bottom</p>
              </div>
              <span className="chip bg-amber-100 text-amber-600">{data.attention.length}</span>
            </div>
            {data.attention.length === 0 ? (
              <Empty icon="check" title="All clear" hint="No unconfirmed visits or unfilled cancellations right now." />
            ) : (
              <ul className="divide-y divide-sand-100">
                {data.attention.map((item, index) => (
                  <li key={`${item.type}-${index}`}>
                    <button
                      type="button"
                      onClick={() =>
                        item.appointment ? setDrawerId(item.appointment.id) : navigate('/app/waitlist')
                      }
                      className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition hover:bg-sand-50"
                    >
                      <span className={`chip mt-0.5 shrink-0 ${attentionTone[item.type] || 'bg-sand-200 text-navy-700'}`}>
                        {item.type.replace('_', ' ').toLowerCase()}
                      </span>
                      <span className="text-xs leading-relaxed text-navy-800">{item.message}</span>
                      {item.type === 'WAITLIST' && <Icon name="chevron-right" className="mt-0.5 ml-auto h-3.5 w-3.5 text-sand-400" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {data.attention.some((item) => item.type === 'WAITLIST') && (
              <div className="border-t border-sand-200 px-4 py-2.5">
                <Link to="/app/waitlist" className="text-xs font-semibold text-teal-700 hover:underline">
                  Open the waitlist →
                </Link>
              </div>
            )}
          </section>

          <section className="card">
            <div className="flex items-center justify-between border-b border-sand-200 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-navy-900">Cancellation recovery</h3>
                <p className="text-xs text-muted">Freed slots waiting to be rebooked</p>
              </div>
              <Icon name="clock" className="h-4 w-4 text-teal-600" />
            </div>
            {data.recoveryQueue.length === 0 ? (
              <Empty icon="sparkles" title="No open slots" hint="Cancelled slots in the next three days have been filled." />
            ) : (
              <ul className="divide-y divide-sand-100">
                {data.recoveryQueue.map((slot) => (
                  <li key={slot.cancelledAppointmentId} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-navy-900">
                          {relativeDayLabel(slot.startAt.slice(0, 10))} · {timeLabel(slot.startAt)}
                        </p>
                        <p className="text-[11px] text-muted">
                          Dr. {slot.doctor.name} · freed by {slot.cancelledPatient.name}
                        </p>
                      </div>
                      <span className={`chip ${slot.matches.length > 0 ? 'bg-teal-50 text-teal-700' : 'bg-sand-200 text-navy-700'}`}>
                        {slot.matches.length} match{slot.matches.length === 1 ? '' : 'es'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] text-muted">
                        {slot.matches.length > 0
                          ? `First: ${slot.matches[0].patient.name} · ${slot.matches[0].preferredTimeOfDay.toLowerCase()}`
                          : 'No waitlist patient matches this slot yet'}
                      </p>
                      <button
                        type="button"
                        className="btn-outline btn-sm shrink-0"
                        disabled={slot.matches.length === 0}
                        onClick={() => setOffer(slot)}
                      >
                        Offer slot
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-sand-200 px-4 py-2.5">
              <Link to="/app/waitlist" className="text-xs font-semibold text-teal-700 hover:underline">
                View the full recovery board →
              </Link>
            </div>
          </section>
        </div>
      </div>

      <AppointmentDrawer
        appointmentId={drawerId}
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
        onChanged={() => load(true)}
      />

      <Modal
        open={Boolean(offer)}
        onClose={() => setOffer(null)}
        title="Offer this freed slot"
        subtitle={offer ? `${relativeDayLabel(offer.startAt.slice(0, 10))} · ${timeLabel(offer.startAt)} with Dr. ${offer.doctor.name}` : ''}
      >
        {offer && (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-300/60 bg-amber-100/40 px-3 py-2.5 text-xs text-navy-800">
              Booking from the waitlist marks this appointment as a recovered slot, so it counts toward the
              slot recovery rate.
            </div>
            {offer.matches.length === 0 && <ErrorBanner message="No matching waitlist patient yet." />}
            <ul className="space-y-2">
              {offer.matches.map((match) => (
                <li key={match.id} className="flex items-center gap-3 rounded-xl border border-sand-200 px-3 py-2.5">
                  <Avatar name={match.patient.name} className="h-9 w-9 text-[11px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy-900">{match.patient.name}</p>
                    <p className="text-[11px] text-muted">
                      {match.patient.phone} · prefers {match.preferredTimeOfDay.toLowerCase()}
                    </p>
                  </div>
                  <button type="button" className="btn-primary btn-sm" disabled={offering} onClick={() => offerSlot(match)}>
                    Book
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  )
}
