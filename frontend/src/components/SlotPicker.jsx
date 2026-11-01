import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { Spinner } from './ui'
import { timeLabel } from '../lib/format'
import Icon from './Icon'

function session(hour) {
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  return 'Evening'
}

export default function SlotPicker({ doctorId, date, value, onChange }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([])
      return undefined
    }
    let active = true
    setLoading(true)
    setError('')
    api
      .availability(date)
      .then((data) => {
        if (!active) return
        const doctor = data.doctors.find((entry) => String(entry.doctorId) === String(doctorId))
        setSlots(doctor?.slots ?? [])
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [doctorId, date])

  const groups = useMemo(() => {
    const map = new Map()
    slots.forEach((slot) => {
      const label = session(new Date(slot.startAt).getHours())
      if (!map.has(label)) map.set(label, [])
      map.get(label).push(slot)
    })
    return [...map.entries()]
  }, [slots])

  if (!doctorId || !date) {
    return <p className="rounded-xl border border-dashed border-sand-300 px-4 py-6 text-center text-sm text-muted">Choose a doctor and date to see open times.</p>
  }
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-sand-200 px-4 py-6 text-sm text-muted">
        <Spinner className="h-4 w-4 text-teal-600" /> Loading the doctor's day…
      </div>
    )
  }
  if (error) {
    return <p className="rounded-xl border border-clay-100 bg-clay-50 px-4 py-3 text-sm text-clay-600">{error}</p>
  }
  if (groups.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-dashed border-sand-300 px-4 py-6 text-center text-sm text-muted">
        <Icon name="calendar" className="h-4 w-4" /> This doctor does not work on that day.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map(([label, items]) => (
        <div key={label}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            {label}
            <span className="ml-2 font-normal normal-case tracking-normal text-sand-400">
              {items.filter((slot) => slot.available).length} open
            </span>
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((slot) => {
              const selected = value === slot.startAt
              const disabled = !slot.available && !selected
              return (
                <button
                  key={slot.startAt}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(slot.startAt)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                    selected
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : disabled
                        ? 'cursor-not-allowed border-sand-200 bg-sand-100 text-sand-400 line-through'
                        : 'border-sand-300 bg-white text-navy-800 hover:border-teal-400 hover:bg-teal-50'
                  }`}
                >
                  {timeLabel(slot.startAt)}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-[11px] text-muted">Struck-through times are booked, blocked or in the past.</p>
    </div>
  )
}
