import Reveal from '@/components/public/Reveal';
import {
  WobblyCheck,
  CurvedArrow,
} from '@/components/public/illustrations/marks';
import {
  AutopilotSpot,
  SpreadsheetSwap,
} from '@/components/public/illustrations/spots';

// The operating promise: the system flies the route; you make the calls.
// Deliberately concrete — every claim below maps to a shipped behaviour
// (charge generation, delivery clocks, the Action Center) except the
// spreadsheet import, which is labelled coming soon rather than implied.
export default function Autopilot() {
  return (
    <section id="autopilot" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-kicker">On autopilot</p>
            <h2 className="text-title mt-3 text-ink">
              It runs the month so you don&apos;t have to.
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-3">
              Rentium isn&apos;t a filing cabinet you have to remember to open.
              Rent charges post themselves on schedule. Legal deadlines are
              computed from your province&apos;s rules the moment they start
              ticking. Entry notices go out when a visit is booked. The only
              thing that reaches you is the short list of decisions that
              actually need a human.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="flex flex-col items-start gap-6">
              <AutopilotSpot className="h-40 self-center sm:h-48" />
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-ink">
                  The month, handled
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {[
                    'Rent and utility charges generate themselves — prorated correctly on mid-month move-ins',
                    'Inspection and deposit deadlines counted down from the statutory clock, not your memory',
                    'One Action Center that surfaces only what needs you today — and stays empty when nothing does',
                  ].map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm leading-6 text-ink-2"
                    >
                      <WobblyCheck className="mt-1 shrink-0 text-brand" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="flex flex-col items-start gap-6">
              <SpreadsheetSwap className="h-40 self-center sm:h-48" />
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-ink">
                  Your data stays yours
                </h3>
                <p className="mt-3 text-sm leading-6 text-ink-3">
                  Been running the portfolio from a spreadsheet for years?
                  You&apos;ll be able to bring those rows straight in — and
                  everything Rentium records can go back out the same way,
                  whenever you want it.
                </p>
                <ul className="mt-4 space-y-2.5">
                  {[
                    'Export your ledger, tenancies and history — no lock-in, ever',
                    'Spreadsheet import for existing portfolios (coming soon)',
                    'An append-only record underneath, so what you export is exactly what happened',
                  ].map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm leading-6 text-ink-2"
                    >
                      <WobblyCheck className="mt-1 shrink-0 text-brand" />
                      {point}
                    </li>
                  ))}
                </ul>
                <p className="relative mt-6 inline-flex items-center gap-2 text-sm font-medium text-ink-2">
                  <CurvedArrow className="h-8 -scale-x-100 text-brand" />
                  You stay the pilot — it just stops being manual labour.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
