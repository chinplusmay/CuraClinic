import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { ErrorBanner, Loading, Segmented, StatCard } from '../components/ui'
import Icon from '../components/Icon'
import {
  NOTIFICATION_TYPE,
  ORIGIN_LABELS,
  addDaysIso,
  dayLabel,
  percent,
  shortDate,
  todayIso,
} from '../lib/format'

const ranges = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]

function Metric({ label, value, hint, tone }) {
  return <StatCard label={label} value={value} hint={hint} tone={tone} />
}

export default function Analytics() {
  const [days, setDays] = useState(30)
  const [from, setFrom] = useState(addDaysIso(todayIso(), -29))
  const [to, setTo] = useState(todayIso())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.analytics(from, to))
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  function applyRange(value) {
    setDays(value)
    setTo(todayIso())
    setFrom(addDaysIso(todayIso(), -(value - 1)))
  }

  const buckets = useMemo(() => {
    if (!data) return []
    const size = Math.max(1, Math.ceil(data.trend.length / 30))
    const groups = []
    for (let index = 0; index < data.trend.length; index += size) {
      const chunk = data.trend.slice(index, index + size)
      groups.push({
        label: chunk[0].date,
        booked: chunk.reduce((sum, point) => sum + point.booked, 0),
        completed: chunk.reduce((sum, point) => sum + point.completed, 0),
        noShow: chunk.reduce((sum, point) => sum + point.noShow, 0),
        cancelled: chunk.reduce((sum, point) => sum + point.cancelled, 0),
        recovered: chunk.reduce((sum, point) => sum + point.recovered, 0),
      })
    }
    return groups
  }, [data])

  if (loading && !data) return <Loading label="Crunching appointment history" />
  if (error && !data) return <ErrorBanner message={error} />

  const { totals, rates, cancellations, reminders, byDoctor, bySource } = data
  const maxBucket = Math.max(...buckets.map((bucket) => bucket.booked), 1)
  const recoverable = cancellations.patientLate + cancellations.patientAdvance
  const unfilled = Math.max(0, recoverable - totals.recovered)

  const narrative = (() => {
    if (totals.booked === 0) return 'No appointments were booked in this period. Pick a wider range.'
    const parts = []
    parts.push(
      `${percent(rates.attendanceRate, 1)} of due visits were attended, with a ${percent(rates.noShowRate, 1)} no-show rate.`,
    )
    if (recoverable > 0) {
      parts.push(
        `The waitlist filled ${totals.recovered} of ${recoverable} recoverable cancellations (${percent(rates.slotRecoveryRate, 1)}).`,
      )
      if (unfilled > 0) {
        parts.push(`${unfilled} freed slots were never rebooked — the clearest opportunity in this period.`)
      }
    }
    if (rates.reminderDeliveryRate < 0.95) {
      parts.push(
        `Reminder delivery is ${percent(rates.reminderDeliveryRate, 1)}; ${reminders.failed} messages failed and need contact details checked.`,
      )
    }
    if (rates.utilization < 0.6) {
      parts.push(`Only ${percent(rates.utilization, 1)} of available doctor time is booked, leaving room to grow without adding hours.`)
    }
    return parts.join(' ')
  })()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">Operations analytics</h2>
          <p className="mt-0.5 text-sm text-muted">
            {dayLabel(from)} → {dayLabel(to)} · {data.days} days · {totals.booked} appointments in the cohort
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={days} onChange={applyRange} options={ranges} />
          <input
            type="date"
            className="input w-auto py-2 text-xs"
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
          />
          <span className="text-xs text-muted">to</span>
          <input
            type="date"
            className="input w-auto py-2 text-xs"
            value={to}
            min={from}
            max={todayIso()}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="rounded-2xl border border-teal-200 bg-teal-50/60 px-5 py-4">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-700">
          <Icon name="sparkles" className="h-3.5 w-3.5" /> What this period says
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-navy-800">{narrative}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          label="No-show rate"
          value={percent(rates.noShowRate, 1)}
          hint={`${totals.noShow} no-shows of ${totals.eligibleForNoShow} visits due`}
          tone={rates.noShowRate > 0.15 ? 'amber' : 'default'}
        />
        <Metric
          label="Attendance rate"
          value={percent(rates.attendanceRate, 1)}
          hint={`${totals.completed} attended visits`}
          tone="teal"
        />
        <Metric
          label="Slot recovery rate"
          value={percent(rates.slotRecoveryRate, 1)}
          hint={`${totals.recovered} slots filled from waitlist of ${recoverable} recoverable cancellations`}
        />
        <Metric
          label="Appointment utilisation"
          value={percent(rates.utilization, 1)}
          hint="Booked minutes ÷ available doctor minutes"
        />
        <Metric
          label="Reminder delivery"
          value={percent(rates.reminderDeliveryRate, 1)}
          hint={`${totals.reminderSent} delivered of ${totals.reminderAttempted} attempted`}
          tone={rates.reminderDeliveryRate < 0.9 ? 'amber' : 'default'}
        />
        <Metric
          label="Cancellation rate"
          value={percent(rates.cancellationRate, 1)}
          hint={`${totals.cancelled} of ${totals.booked} appointments cancelled`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-navy-900">Appointment outcomes over time</h3>
              <p className="text-xs text-muted">
                {buckets.length > 1 ? `${Math.ceil(data.trend.length / buckets.length)}-day buckets` : 'Daily'} · stacked visits
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-[10px] text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-teal-500" /> attended</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-clay-400" /> no-show</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-sand-300" /> cancelled</span>
            </div>
          </div>
          <div className="mt-5 flex h-52 items-end gap-1.5">
            {buckets.map((bucket) => {
              const total = bucket.booked || 1
              return (
                <div
                  key={bucket.label}
                  className="group relative flex h-full flex-1 flex-col justify-end gap-[2px]"
                  title={`${shortDate(bucket.label)} · ${bucket.booked} booked, ${bucket.completed} attended, ${bucket.noShow} no-show, ${bucket.cancelled} cancelled`}
                >
                  <div className="flex-1" />
                  {bucket.cancelled > 0 && (
                    <div
                      className="w-full rounded-t-sm bg-sand-300"
                      style={{ height: `${(bucket.cancelled / maxBucket) * 100}%` }}
                    />
                  )}
                  {bucket.noShow > 0 && (
                    <div
                      className="w-full bg-clay-400"
                      style={{ height: `${(bucket.noShow / maxBucket) * 100}%` }}
                    />
                  )}
                  <div
                    className="w-full rounded-b-sm bg-teal-500 transition group-hover:bg-teal-600"
                    style={{ height: `${(bucket.completed / maxBucket) * 100}%` }}
                  />
                  <span className="absolute inset-x-0 -bottom-5 hidden truncate text-center text-[9px] text-muted group-hover:block">
                    {shortDate(bucket.label)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-6 flex items-center justify-between text-[10px] text-muted">
            <span>{shortDate(buckets[0]?.label)}</span>
            <span>{shortDate(buckets[buckets.length - 1]?.label)}</span>
          </div>
        </section>

        <section className="card p-5">
          <h3 className="text-sm font-semibold text-navy-900">Where the leakage comes from</h3>
          <p className="text-xs text-muted">Cancellation causes and no-shows are counted separately</p>
          <div className="mt-4 space-y-3">
            {[
              ['Patient — late cancellation', cancellations.patientLate, 'bg-amber-400'],
              ['Patient — cancelled in advance', cancellations.patientAdvance, 'bg-teal-400'],
              ['Clinic cancelled', cancellations.clinic, 'bg-sand-400'],
              ['No-show', cancellations.noShow, 'bg-clay-400'],
            ].map(([label, value, tone]) => {
              const totalRow = cancellations.patientLate + cancellations.patientAdvance + cancellations.clinic + cancellations.noShow || 1
              return (
                <div key={label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-navy-800">{label}</span>
                    <span className="font-semibold text-navy-900">{value}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand-100">
                    <div className={`h-full rounded-full ${tone}`} style={{ width: `${(value / totalRow) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 rounded-xl bg-sand-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Recovery funnel</p>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted">Recoverable cancellations</span><span className="font-semibold text-navy-900">{recoverable}</span></div>
              <div className="flex justify-between"><span className="text-muted">Filled from waitlist</span><span className="font-semibold text-teal-700">{totals.recovered}</span></div>
              <div className="flex justify-between"><span className="text-muted">Left unfilled</span><span className="font-semibold text-clay-500">{unfilled}</span></div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="card overflow-hidden">
          <div className="border-b border-sand-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-navy-900">Doctor performance</h3>
            <p className="text-xs text-muted">Where attendance and capacity differ</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className="table-head">Doctor</th>
                  <th className="table-head">Booked</th>
                  <th className="table-head">Attended</th>
                  <th className="table-head">No-shows</th>
                  <th className="table-head">No-show rate</th>
                  <th className="table-head">Utilisation</th>
                </tr>
              </thead>
              <tbody>
                {byDoctor.map((doctor) => (
                  <tr key={doctor.doctorId} className="hover:bg-sand-50">
                    <td className="table-cell">
                      <p className="font-medium text-navy-900">Dr. {doctor.name}</p>
                      <p className="text-[11px] text-muted">{doctor.specialty}</p>
                    </td>
                    <td className="table-cell text-navy-900">{doctor.booked}</td>
                    <td className="table-cell text-teal-700">{doctor.completed}</td>
                    <td className="table-cell text-clay-500">{doctor.noShow}</td>
                    <td className="table-cell">
                      <span className={`chip ${doctor.noShowRate > 0.15 ? 'bg-clay-50 text-clay-500' : 'bg-sand-100 text-navy-700'}`}>
                        {percent(doctor.noShowRate, 1)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-sand-200">
                          <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, doctor.utilization * 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted">{percent(doctor.utilization)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-navy-900">Reminder performance</h3>
                <p className="text-xs text-muted">Across the selected period</p>
              </div>
              <span className="chip bg-teal-50 text-teal-700">{percent(rates.reminderDeliveryRate)} delivered</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ['Queued', reminders.total, 'text-navy-900'],
                ['Delivered', reminders.sent, 'text-teal-700'],
                ['Failed', reminders.failed, 'text-clay-500'],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-xl bg-sand-50 px-2 py-2.5">
                  <p className={`font-display text-lg font-bold ${tone}`}>{value}</p>
                  <p className="text-[10px] text-muted">{label}</p>
                </div>
              ))}
            </div>
            <ul className="mt-4 space-y-1.5">
              {Object.entries(reminders.byType).map(([type, count]) => (
                <li key={type} className="flex items-center justify-between text-xs">
                  <span className="text-muted">{NOTIFICATION_TYPE[type] || type}</span>
                  <span className="font-medium text-navy-900">{count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h3 className="text-sm font-semibold text-navy-900">Booking channels</h3>
            <p className="text-xs text-muted">Where appointments came from</p>
            <ul className="mt-3 space-y-2">
              {bySource.map((source) => (
                <li key={source.origin} className="flex items-center justify-between text-xs">
                  <span className="text-muted">{ORIGIN_LABELS[source.origin] || source.origin}</span>
                  <span className="font-medium text-navy-900">{source.count}</span>
                </li>
              ))}
              {bySource.length === 0 && <li className="text-xs text-muted">No appointments in this range.</li>}
            </ul>
          </section>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        Definitions: no-show rate uses attendance-eligible visits (attended + no-show); cancellation rate uses all
        appointments booked in the period; slot recovery counts waitlist bookings attributed to cancelled slots;
        utilisation compares booked minutes with scheduled doctor minutes.
      </p>
    </div>
  )
}
