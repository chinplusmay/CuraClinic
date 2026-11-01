const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
const dayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const longDayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

export function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  return new Date(value)
}

export function timeLabel(value) {
  const date = parseDate(value)
  return date ? timeFmt.format(date) : '—'
}

export function dayLabel(value) {
  const date = parseDate(value)
  return date ? dayFmt.format(date) : '—'
}

export function longDayLabel(value) {
  const date = parseDate(value)
  return date ? longDayFmt.format(date) : '—'
}

export function shortDate(value) {
  const date = parseDate(value)
  return date ? shortFmt.format(date) : '—'
}

export function isoDate(value) {
  const date = parseDate(value) || new Date()
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayIso() {
  return isoDate(new Date())
}

export function addDays(dateOrIso, days) {
  const date = typeof dateOrIso === 'string' ? new Date(`${dateOrIso}T12:00:00`) : new Date(dateOrIso)
  date.setDate(date.getDate() + days)
  return date
}

export function addDaysIso(dateOrIso, days) {
  return isoDate(addDays(dateOrIso, days))
}

export function weekdayShort(value) {
  const date = parseDate(value)
  return date ? new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date) : ''
}

export function relativeDayLabel(dateIso) {
  if (!dateIso) return ''
  if (dateIso === todayIso()) return 'Today'
  if (dateIso === addDaysIso(todayIso(), 1)) return 'Tomorrow'
  if (dateIso === addDaysIso(todayIso(), -1)) return 'Yesterday'
  return dayLabel(dateIso)
}

export function minutesLabel(minutes) {
  if (minutes == null) return '—'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

export function percent(value, digits = 0) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(digits)}%`
}

export function initials(name = '') {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function hhmm(value) {
  if (!value) return ''
  return value.slice(0, 5)
}

export function toDateTimeInput(iso) {
  if (!iso) return ''
  return parseDate(iso) ? isoDate(iso) + 'T' + iso.slice(11, 16) : ''
}

export const APPOINTMENT_STATUS = {
  SCHEDULED: { label: 'Scheduled', chip: 'bg-amber-100 text-amber-600', dot: 'bg-amber-500' },
  CONFIRMED: { label: 'Confirmed', chip: 'bg-teal-50 text-teal-700', dot: 'bg-teal-500' },
  COMPLETED: { label: 'Attended', chip: 'bg-teal-100 text-teal-800', dot: 'bg-teal-700' },
  NO_SHOW: { label: 'No-show', chip: 'bg-clay-100 text-clay-600', dot: 'bg-clay-500' },
  CANCELLED: { label: 'Cancelled', chip: 'bg-sand-200 text-navy-700', dot: 'bg-sand-400' },
}

export const CANCELLATION_TYPES = {
  PATIENT_LATE: { label: 'Patient — late cancellation' },
  PATIENT_ADVANCE: { label: 'Patient — cancelled in advance' },
  CLINIC: { label: 'Clinic — cancelled' },
}

export const REMINDER_STATUS = {
  PENDING: { label: 'Queued', chip: 'bg-sand-200 text-navy-700' },
  SENT: { label: 'Delivered', chip: 'bg-teal-50 text-teal-700' },
  FAILED: { label: 'Failed', chip: 'bg-clay-100 text-clay-600' },
  CANCELLED: { label: 'Stopped', chip: 'bg-sand-200 text-navy-700' },
}

export const NOTIFICATION_TYPE = {
  CONFIRMATION: 'Booking confirmation',
  REMINDER_24H: '24-hour reminder',
  REMINDER_2H: '2-hour reminder',
  FOLLOW_UP: 'Follow-up',
}

export const EVENT_LABELS = {
  BOOKED: 'Booked',
  RESCHEDULED: 'Rescheduled',
  CONFIRMED: 'Confirmed',
  REMINDER_SENT: 'Reminder sent',
  COMPLETED: 'Attended',
  NO_SHOW: 'No-show recorded',
  CANCELLED: 'Cancelled',
  WAITLIST_OFFERED: 'Filled from waitlist',
}

export const ORIGIN_LABELS = {
  STAFF: 'Reception',
  PHONE: 'Phone',
  WAITLIST: 'Waitlist recovery',
  ONLINE: 'Online',
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
