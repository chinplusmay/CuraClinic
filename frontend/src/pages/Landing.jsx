import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import { useAuth } from '../lib/auth'
import { percent } from '../lib/format'

const leaks = [
  {
    icon: 'bell',
    title: 'Unconfirmed visits',
    body: 'A booking is not a promise. When a patient never replies, the slot sits there unconfirmed until it quietly disappears.',
    stat: 'Unconfirmed',
    note: 'is the number reception works from, not the total booked.',
  },
  {
    icon: 'clock',
    title: 'Unfilled cancellations',
    body: 'A 6:20 pm slot frees up at 2 pm. The paper waitlist is a list of names with no way to see who can actually take it.',
    stat: 'Open slot',
    note: 'with no owner becomes lost capacity within hours.',
  },
  {
    icon: 'chart',
    title: 'Invisible leakage',
    body: 'No-shows, late cancellations and clinic cancellations blur into “a busy day”, so nobody knows which fix is working.',
    stat: 'No data',
    note: 'means no way to prove the reminders paid for themselves.',
  },
]

const features = [
  {
    icon: 'clock',
    title: 'A recovery board, not a paper waitlist',
    body: 'Every cancellation that leaves a usable slot is paired with waiting patients who match the doctor, date and time of day. Offer it in one click.',
    span: 'sm:col-span-2',
    accent: true,
  },
  {
    icon: 'grid',
    title: 'The front desk starts with a plan',
    body: 'Unconfirmed visits, freed slots and same-day follow-ups are surfaced in the order they need attention.',
  },
  {
    icon: 'send',
    title: 'A reminder trail you can audit',
    body: 'See what was queued, delivered, failed or stopped after a cancellation — and whether the patient confirmed.',
  },
  {
    icon: 'chart',
    title: 'Leakage, split by cause',
    body: 'No-shows, patient cancellations and clinic cancellations stay separate so the owner can see what is actually recoverable.',
  },
  {
    icon: 'layers',
    title: 'Slot recovery you can report',
    body: 'Count the cancellations you filled from the waitlist and the capacity each recovered booking returned to the clinic.',
  },
  {
    icon: 'shield',
    title: 'Deliberately not an EMR',
    body: 'No clinical notes, prescriptions or lab integrations to migrate. Just the operational layer your reception already needs.',
  },
]

const steps = [
  { title: 'Book', body: 'Phone, walk-in or online, with working hours and conflicts enforced by the calendar.' },
  { title: 'Confirm & remind', body: 'Confirmation, 24-hour and 2-hour reminders queue automatically and record delivery.' },
  { title: 'Recover', body: 'A cancellation lands on the recovery board with waitlist matches ready to offer.' },
  { title: 'Record attendance', body: 'Attended, no-show or cancelled — every outcome gets an owner and a reason.' },
  { title: 'Measure', body: 'Weekly no-show, cancellation and recovery rates show which actions changed the numbers.' },
]

const metrics = [
  { name: 'No-show rate', definition: 'No-shows ÷ visits that were due (attended + no-show).', use: 'Tells the owner how much demand never arrives.' },
  { name: 'Cancellation rate', definition: 'Cancellations ÷ appointments booked in the period.', use: 'Separates patient behaviour from schedule churn.' },
  { name: 'Slot recovery rate', definition: 'Cancelled slots rebooked from the waitlist ÷ recoverable cancellations.', use: 'Proves the recovery workflow pays for itself.' },
  { name: 'Attendance rate', definition: 'Attended visits ÷ visits due.', use: 'The clinic’s truest service-delivery number.' },
  { name: 'Appointment utilisation', definition: 'Booked minutes ÷ doctor working-hour minutes.', use: 'Shows unused capacity before hiring another doctor.' },
  { name: 'Reminder delivery', definition: 'Delivered reminders ÷ attempted reminders.', use: 'Catches bad phone numbers and failing channels.' },
]

const fallbackSnapshot = {
  noShowRate: 0.13,
  slotRecoveryRate: 0.37,
  reminderDeliveryRate: 0.94,
  utilization: 0.51,
}

export default function Landing() {
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState(fallbackSnapshot)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/public/snapshot')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active || !data) return
        setSnapshot(data)
        setLive(true)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-sand-50 text-ink">
      <header className="sticky top-0 z-40 border-b border-sand-200/70 bg-sand-50/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" aria-label="CuraClinic home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-navy-700 md:flex">
            <a href="#problem" className="hover:text-teal-700">Why clinics lose slots</a>
            <a href="#product" className="hover:text-teal-700">Product</a>
            <a href="#workflow" className="hover:text-teal-700">Workflow</a>
            <a href="#metrics" className="hover:text-teal-700">Metrics</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden text-sm font-semibold text-navy-800 hover:text-teal-700 sm:block">
              Sign in
            </Link>
            <Link to="/register" className="hidden text-sm font-semibold text-teal-700 hover:underline sm:block">
              Register clinic
            </Link>
            <Link to={user ? '/app' : '/login'} className="btn-primary btn-sm sm:px-4 sm:py-2.5 sm:text-sm">
              {user ? 'Open workspace' : 'Open the demo'}
              <Icon name="arrow-right" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 math-grid opacity-60" aria-hidden="true" />
        <div className="absolute -right-40 -top-24 h-96 w-96 rounded-full bg-teal-200/40 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Appointment operations · not another EMR
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.06] text-navy-950 sm:text-5xl lg:text-[3.9rem]">
              Recover the slots
              <br className="hidden sm:block" /> your clinic <span className="text-teal-600">already paid for</span>.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-navy-700/80 sm:text-base">
              CuraClinic gives independent clinics one place to confirm visits, fill last-minute cancellations
              from the waitlist, and see exactly where appointment capacity leaks. Built for the reception desk
              that is still running on phone calls and a paper register.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to={user ? '/app' : '/login'} className="btn-accent px-5 py-3 text-sm">
                Open the demo workspace
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
              <Link to="/register" className="btn-outline px-5 py-3 text-sm">
                Register your clinic
              </Link>
              <a href="#workflow" className="btn-outline px-5 py-3 text-sm">
                See how recovery works
              </a>
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5"><Icon name="check" className="h-3.5 w-3.5 text-teal-600" /> 1–5 doctor clinics</span>
              <span className="flex items-center gap-1.5"><Icon name="check" className="h-3.5 w-3.5 text-teal-600" /> Reception-first</span>
              <span className="flex items-center gap-1.5"><Icon name="check" className="h-3.5 w-3.5 text-teal-600" /> Live demo data</span>
            </p>
          </div>

          <div className="relative animate-fade-up" style={{ animationDelay: '90ms' }}>
            <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-lift">
              <div className="flex items-center justify-between bg-navy-950 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Logo variant="light" showWordmark={false} className="scale-90" />
                  <div>
                    <p className="text-xs font-semibold text-white">Reception desk</p>
                    <p className="text-[10px] text-teal-100/60">Northbridge Family Clinic · Fri 30 Oct</p>
                  </div>
                </div>
                <span className="chip bg-white/10 text-[10px] text-teal-100">Live demo</span>
              </div>
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['Today', '36'],
                    ['Unconfirmed', '17'],
                    ['Open slots', '5'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-sand-200 bg-sand-50 px-2.5 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">{label}</p>
                      <p className="font-display text-xl font-bold text-navy-900">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Today’s agenda</p>
                  {[
                    { time: '9:00', patient: 'Aarav Sharma', doctor: 'Dr. Rao', status: 'Confirmed', tone: 'teal' },
                    { time: '9:20', patient: 'Diya Patel', doctor: 'Dr. Shah', status: 'Unconfirmed', tone: 'amber' },
                    { time: '9:40', patient: 'Rohan Mehta', doctor: 'Dr. Rao', status: 'Confirmed', tone: 'teal' },
                  ].map((row) => (
                    <div key={row.time} className="flex items-center gap-2.5 rounded-lg border border-sand-200 px-2.5 py-2">
                      <span className="w-9 text-[10px] font-semibold text-navy-700">{row.time}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-navy-900">{row.patient}</p>
                        <p className="text-[9px] text-muted">{row.doctor}</p>
                      </div>
                      <span className={`chip px-2 py-0.5 text-[9px] ${row.tone === 'teal' ? 'bg-teal-50 text-teal-700' : 'bg-amber-100 text-amber-600'}`}>
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-amber-300/60 bg-amber-100/50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Freed slot · 6:20 pm</p>
                    <span className="chip bg-white/80 text-[9px] text-amber-600">2 matches</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-navy-800">
                    Kabir Reddy wants an evening review. First in the waitlist, 20-minute consult.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-lg bg-navy-900 px-2.5 py-1 text-[10px] font-semibold text-white">Offer slot</span>
                    <span className="text-[9px] text-muted">Recovered from a late cancellation</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 py-2 shadow-lift sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                <Icon name="sparkles" className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold text-navy-900">Slot recovered</p>
                <p className="text-[9px] text-muted">Waitlist → 6:20 pm</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-sand-200 bg-white/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-6 text-center sm:grid-cols-4">
          {[
            ['1–5', 'doctors per clinic'],
            ['3', 'channels: phone, walk-in, online'],
            ['1 day', 'to import and start booking'],
            ['0', 'clinical records required'],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="font-display text-2xl font-bold text-navy-900">{value}</p>
              <p className="mt-0.5 text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="problem" className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">The leakage problem</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-[2.4rem]">
            Three leaks that quietly cost an independent clinic its week
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-navy-700/80">
            The problem is not demand. It is everything that happens between a patient saying “book me in” and
            actually walking through the door — and the fact that none of it is measured.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {leaks.map((leak) => (
            <article key={leak.title} className="card p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Icon name={leak.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{leak.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{leak.body}</p>
              <div className="mt-5 border-t border-sand-200 pt-3">
                <p className="font-display text-base font-bold text-navy-900">{leak.stat}</p>
                <p className="text-xs text-muted">{leak.note}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="product" className="border-y border-sand-200 bg-sand-100/70 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="eyebrow">What CuraClinic does</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-[2.4rem]">
                The operational layer between booking and attendance
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              Six capabilities, one workflow. Every one of them exists to protect a slot the clinic has
              already allocated.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className={`card p-6 ${feature.span || ''} ${feature.accent ? 'bg-navy-950 text-white' : ''}`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    feature.accent ? 'bg-white/10 text-teal-300' : 'bg-sand-100 text-teal-700'
                  }`}
                >
                  <Icon name={feature.icon} className="h-4 w-4" />
                </span>
                <h3 className={`mt-4 text-base font-semibold ${feature.accent ? 'text-white' : ''}`}>{feature.title}</h3>
                <p className={`mt-1.5 text-sm leading-relaxed ${feature.accent ? 'text-teal-100/70' : 'text-muted'}`}>
                  {feature.body}
                </p>
                {feature.accent && (
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4 text-[11px] text-teal-100/70">
                    <span className="rounded-md bg-white/5 px-2 py-1">Doctor + date matching</span>
                    <span className="rounded-md bg-white/5 px-2 py-1">Preferred time of day</span>
                    <span className="rounded-md bg-white/5 px-2 py-1">First-come waitlist order</span>
                    <span className="rounded-md bg-white/5 px-2 py-1">Attribution to the cancelled slot</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">The customer journey</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-[2.4rem]">
            Five steps, each one accountable
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-navy-700/80">
            Reception already performs most of these steps. CuraClinic makes them visible, recoverable and
            measurable for a clinic of one to five doctors.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-5">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              <div className="card h-full p-5">
                <span className="font-display text-xs font-bold text-teal-600">0{index + 1}</span>
                <h3 className="mt-2 text-sm font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{step.body}</p>
              </div>
              {index < steps.length - 1 && (
                <Icon
                  name="chevron-right"
                  className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-sand-400 md:block"
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-teal-200 bg-teal-50/60 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <p className="text-sm leading-relaxed text-navy-800">
            <strong className="font-semibold">Recovery is the differentiator.</strong> When a patient cancels,
            CuraClinic keeps the freed slot on a recovery board until someone fills it — and if nobody does, the
            missed opportunity is counted, not forgotten.
          </p>
          <Link to={user ? '/app/waitlist' : '/login'} className="btn-primary mt-4 shrink-0 sm:mt-0">
            Explore the recovery board
          </Link>
        </div>
      </section>

      <section id="metrics" className="border-y border-sand-200 bg-white/70 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="eyebrow">How success is measured</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-[2.4rem]">
                Numbers a clinic owner can act on
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-navy-700/80">
                CuraClinic does not stop at a calendar. Each operational action is tied to a metric, so a clinic
                can see whether reminders, waitlists and confirmation calls actually changed attendance.
              </p>

              <div className="mt-8 rounded-2xl bg-navy-950 p-5 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-200/70">
                    Demo clinic · last 30 days
                  </p>
                  <span className="chip bg-white/10 text-[10px] text-teal-100">{live ? 'Live demo data' : 'Sample'}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-display text-2xl font-bold">{percent(snapshot.noShowRate, 1)}</p>
                    <p className="text-[11px] text-teal-100/60">no-show rate</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold">{percent(snapshot.slotRecoveryRate, 1)}</p>
                    <p className="text-[11px] text-teal-100/60">cancelled slots recovered</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold">{percent(snapshot.reminderDeliveryRate, 1)}</p>
                    <p className="text-[11px] text-teal-100/60">reminder delivery</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold">{percent(snapshot.utilization, 1)}</p>
                    <p className="text-[11px] text-teal-100/60">booked capacity</p>
                  </div>
                </div>
                <p className="mt-4 border-t border-white/10 pt-3 text-[11px] text-teal-100/50">
                  Illustrative clinic data generated by CuraClinic’s demo workspace.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="table-head">Metric</th>
                    <th className="table-head">Definition</th>
                    <th className="table-head">What it answers</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => (
                    <tr key={metric.name} className="align-top hover:bg-sand-50">
                      <td className="table-cell font-semibold text-navy-900">{metric.name}</td>
                      <td className="table-cell text-xs leading-relaxed text-muted">{metric.definition}</td>
                      <td className="table-cell text-xs leading-relaxed text-muted">{metric.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="card p-7">
            <p className="eyebrow">Who it is for</p>
            <h2 className="mt-3 text-2xl font-bold">Independent outpatient clinics with one to five doctors</h2>
            <ul className="mt-5 space-y-3 text-sm text-navy-800">
              {[
                'Reception runs appointments by phone, WhatsApp and a paper register.',
                'Scheduled consultations and repeat visits dominate the day.',
                'The owner wants better slot use without buying a hospital suite.',
                'Patients should not need an app or account to manage a visit.',
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-xl bg-sand-100 px-4 py-3 text-xs leading-relaxed text-muted">
              Not a fit yet: multi-site hospital groups, inpatient wards, insurance claims and clinical
              documentation workflows. CuraClinic stays deliberately narrow.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-2xl bg-teal-700 p-7 text-white">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-200">
                Try the working product
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-white">
                A full clinic workspace, already seeded with six weeks of appointments
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-teal-50/80">
                Open the demo as the clinic owner or the receptionist. Book, cancel, fill a slot from the
                waitlist and watch the analytics update.
              </p>
            </div>
            <div className="mt-7 space-y-3">
              <Link to={user ? '/app' : '/login'} className="btn-accent w-full py-3">
                {user ? 'Open my workspace' : 'Open the demo workspace'}
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
              <div className="rounded-xl bg-navy-950/30 px-4 py-3 font-mono text-[11px] text-teal-50/90">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-teal-200/60">
                  Demo credentials
                </p>
                <p className="mt-1">owner@northbridgeclinic.com</p>
                <p>clinicflow123</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-sand-200 bg-sand-100/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Appointment operations for independent clinics. Reduce missed visits, recover cancelled slots
              and measure what actually improves attendance.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-xs">
            <div>
              <p className="font-semibold uppercase tracking-wider text-navy-900">Product</p>
              <ul className="mt-3 space-y-2 text-muted">
                <li><a href="#product" className="hover:text-teal-700">Capabilities</a></li>
                <li><a href="#workflow" className="hover:text-teal-700">Recovery workflow</a></li>
                <li><a href="#metrics" className="hover:text-teal-700">Metrics</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wider text-navy-900">Workspace</p>
              <ul className="mt-3 space-y-2 text-muted">
                <li><Link to="/login" className="hover:text-teal-700">Sign in</Link></li>
                <li><Link to="/register" className="hover:text-teal-700">Register your clinic</Link></li>
                <li><Link to={user ? '/app' : '/login'} className="hover:text-teal-700">Demo clinic</Link></li>
                <li><a href="mailto:hello@curaclinic.app" className="hover:text-teal-700">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-sand-200 px-5 py-4">
          <p className="mx-auto max-w-6xl text-[11px] text-muted">
            © 2026 CuraClinic · Demo environment with synthetic clinic data. Not intended for clinical use.
          </p>
        </div>
      </footer>
    </div>
  )
}
