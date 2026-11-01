import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useBooking } from '../components/Booking'
import AppointmentDrawer from '../components/AppointmentDrawer'
import { Avatar, Empty, ErrorBanner, Loading, Segmented, StatusChip } from '../components/ui'
import Icon from '../components/Icon'
import {
  APPOINTMENT_STATUS,
  ORIGIN_LABELS,
  addDaysIso,
  dayLabel,
  relativeDayLabel,
  timeLabel,
  todayIso,
} from '../lib/format'

const ranges = [
  { value: 'week', label: 'Next 7 days' },
  { value: 'month', label: 'Next 30 days' },
  { value: 'past', label: 'Last 7 days' },
]

const statusOptions = [
  { value: '', label: 'All statuses' },
  ...Object.entries(APPOINTMENT_STATUS).map(([value, meta]) => ({ value, label: meta.label })),
]

export default function Appointments() {
  const [range, setRange] = useState('week')
  const [from, setFrom] = useState(todayIso())
  const [to, setTo] = useState(addDaysIso(todayIso(), 7))
  const [status, setStatus] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [doctors, setDoctors] = useState([])
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drawerId, setDrawerId] = useState(null)
  const { openBooking } = useBooking()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.appointments({
        from,
        to,
        status: status ? [status] : undefined,
        doctorId: doctorId || undefined,
      })
      setRows(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [from, to, status, doctorId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    api.doctors().then(setDoctors).catch(() => {})
  }, [])

  function applyRange(value) {
    setRange(value)
    const today = todayIso()
    if (value === 'week') {
      setFrom(today)
      setTo(addDaysIso(today, 7))
    } else if (value === 'month') {
      setFrom(today)
      setTo(addDaysIso(today, 30))
    } else {
      setFrom(addDaysIso(today, -7))
      setTo(today)
    }
    setStatus('')
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) =>
      [row.patient.name, row.patient.phone, row.doctor.name].some((value) =>
        value.toLowerCase().includes(term),
      ),
    )
  }, [rows, search])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">Appointment register</h2>
          <p className="mt-0.5 text-sm text-muted">
            {filtered.length} appointment{filtered.length === 1 ? '' : 's'} · {dayLabel(from)} to {dayLabel(to)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={range} onChange={applyRange} options={ranges} />
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => openBooking({ date: from, onBooked: () => load() })}
          >
            <Icon name="plus" className="h-4 w-4" /> New appointment
          </button>
        </div>
      </div>

      <div className="card p-3">
        <div className="grid gap-2 md:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-sand-400" />
            <input
              className="input pl-9"
              placeholder="Search patient, phone or doctor"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <input
            type="date"
            className="input"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value)
              setRange('custom')
            }}
          />
          <input
            type="date"
            className="input"
            value={to}
            onChange={(event) => {
              setTo(event.target.value)
              setRange('custom')
            }}
          />
          <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="input" value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
            <option value="">All doctors</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                Dr. {doctor.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="card overflow-hidden">
        {loading ? (
          <Loading label="Loading appointments" />
        ) : filtered.length === 0 ? (
          <Empty
            icon="list"
            title="No appointments in this view"
            hint="Adjust the dates or filters, or book a new appointment."
            action={
              <button type="button" className="btn-primary btn-sm" onClick={() => openBooking({ date: from, onBooked: () => load() })}>
                Book appointment
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse">
              <thead>
                <tr>
                  <th className="table-head">When</th>
                  <th className="table-head">Patient</th>
                  <th className="table-head">Doctor</th>
                  <th className="table-head">Channel</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Reminders</th>
                  <th className="table-head" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const delivered = row.notifications.filter((item) => item.status === 'SENT').length
                  const failed = row.notifications.filter((item) => item.status === 'FAILED').length
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer transition hover:bg-sand-50"
                      onClick={() => setDrawerId(row.id)}
                    >
                      <td className="table-cell whitespace-nowrap">
                        <p className="font-semibold text-navy-900">{timeLabel(row.startAt)}</p>
                        <p className="text-[11px] text-muted">{relativeDayLabel(row.startAt.slice(0, 10))}</p>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Avatar name={row.patient.name} className="h-7 w-7 text-[10px]" />
                          <div>
                            <p className="font-medium text-navy-900">{row.patient.name}</p>
                            <p className="text-[11px] text-muted">{row.patient.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <p className="text-navy-900">Dr. {row.doctor.name}</p>
                        <p className="text-[11px] text-muted">{row.doctor.specialty}</p>
                      </td>
                      <td className="table-cell text-xs text-muted">
                        {ORIGIN_LABELS[row.origin] || row.origin}
                        {row.recovered && (
                          <span className="mt-1 block">
                            <span className="chip bg-teal-50 px-1.5 py-0.5 text-[9px] text-teal-700">recovered slot</span>
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        <StatusChip status={row.status} />
                        {row.status === 'SCHEDULED' && !row.confirmed && (
                          <p className="mt-1 text-[10px] font-medium text-amber-600">awaiting confirmation</p>
                        )}
                      </td>
                      <td className="table-cell">
                        <p className="text-xs text-navy-800">
                          {delivered}/{row.notifications.length} delivered
                        </p>
                        {failed > 0 && <p className="text-[10px] font-medium text-clay-500">{failed} failed</p>}
                        {row.notifications.length === 0 && <p className="text-[10px] text-muted">none queued</p>}
                      </td>
                      <td className="table-cell text-right">
                        <Icon name="chevron-right" className="ml-auto h-4 w-4 text-sand-400" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AppointmentDrawer
        appointmentId={drawerId}
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
        onChanged={load}
      />
    </div>
  )
}
