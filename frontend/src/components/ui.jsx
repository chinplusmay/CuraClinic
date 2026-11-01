import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { APPOINTMENT_STATUS } from '../lib/format'

export function StatusChip({ status, className = '' }) {
  const meta = APPOINTMENT_STATUS[status] || { label: status, chip: 'bg-sand-200 text-navy-700', dot: 'bg-sand-400' }
  return (
    <span className={`chip ${meta.chip} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-label="Loading"
    />
  )
}

export function Loading({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
      <Spinner className="h-5 w-5 text-teal-600" />
      {label}…
    </div>
  )
}

export function Empty({ title, hint, action, icon = 'layers' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand-100 text-teal-700">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-navy-900">{title}</p>
        {hint && <p className="mt-1 max-w-sm text-sm text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/45 px-0 py-0 backdrop-blur-[2px] sm:items-center sm:px-4 sm:py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={ref}
        className={`animate-scale-in flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-lift sm:rounded-2xl ${widths[size]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-sand-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-navy-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-sand-100 hover:text-navy-900"
            aria-label="Close"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-sand-200 bg-sand-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function Drawer({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-[1px]" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose?.()
    }}>
      <aside className="animate-scale-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-lift">
        <header className="flex items-start justify-between gap-4 border-b border-sand-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-navy-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-sand-100 hover:text-navy-900"
            aria-label="Close"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </header>
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-sand-200 bg-sand-50 px-5 py-3">{footer}</footer>}
      </aside>
    </div>
  )
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-xl border border-sand-200 bg-sand-100 p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            value === option.value ? 'bg-white text-navy-900 shadow-sm' : 'text-muted hover:text-navy-800'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function StatCard({ label, value, hint, tone = 'default', icon, onClick }) {
  const tones = {
    default: 'bg-white',
    teal: 'bg-teal-50 border-teal-100',
    amber: 'bg-amber-100/60 border-amber-300/60',
    navy: 'bg-navy-900 text-white border-navy-900',
  }
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`card p-4 text-left transition ${tones[tone]} ${onClick ? 'hover:-translate-y-0.5 hover:shadow-lift' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-[11px] font-semibold uppercase tracking-wider ${
            tone === 'navy' ? 'text-teal-100/80' : 'text-muted'
          }`}
        >
          {label}
        </p>
        {icon && (
          <span className={tone === 'navy' ? 'text-teal-200' : 'text-teal-600'}>
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={`mt-2 font-display text-2xl font-bold ${tone === 'navy' ? 'text-white' : 'text-navy-900'}`}>
        {value}
      </p>
      {hint && (
        <p className={`mt-1 text-xs ${tone === 'navy' ? 'text-teal-100/70' : 'text-muted'}`}>{hint}</p>
      )}
    </Tag>
  )
}

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const notify = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((current) => [...current, { id, message, tone }])
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4200)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lift animate-fade-up ${
              toast.tone === 'error'
                ? 'border-clay-100 bg-clay-50 text-clay-600'
                : toast.tone === 'info'
                  ? 'border-sand-200 bg-white text-navy-800'
                  : 'border-teal-200 bg-teal-50 text-teal-800'
            }`}
          >
            <Icon name={toast.tone === 'error' ? 'alert' : 'check'} className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1">{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}

export function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-xl border border-clay-100 bg-clay-50 px-3 py-2.5 text-sm text-clay-600">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function Avatar({ name = '', className = 'h-9 w-9 text-xs' }) {
  const initials = name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-800 ${className}`}
    >
      {initials || '?'}
    </span>
  )
}
