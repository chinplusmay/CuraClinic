export default function Logo({ variant = 'dark', className = '', showWordmark = true }) {
  const isLight = variant === 'light'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          isLight ? 'bg-white/10 ring-1 ring-white/15' : 'bg-navy-900'
        }`}
      >
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M7 21c1.9 1.7 4.4 2.6 7.3 2.6 4.1 0 6.7-1.9 6.7-4.8 0-2.6-1.8-4-5.4-4.7l-1.8-.3c-1.7-.3-2.4-.9-2.4-1.8 0-1 1-1.7 2.7-1.7 1.9 0 3.5.6 4.9 1.6"
            stroke="#54A094"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M25 8.5c-1.7 1.4-3.8 2.2-6.2 2.5"
            stroke="#F0B35C"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {showWordmark && (
        <span
          className={`font-display text-[19px] font-extrabold tracking-tight ${
            isLight ? 'text-white' : 'text-navy-900'
          }`}
        >
          Clinic<span className={isLight ? 'text-teal-300' : 'text-teal-600'}>Flow</span>
        </span>
      )}
    </span>
  )
}
