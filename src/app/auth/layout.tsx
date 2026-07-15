// src/app/auth/layout.tsx
// Split-screen auth shell: brand panel on the left, the form on the right.
// Below lg: the panel disappears entirely — mobile gets a clean single
// column with the wordmark on top, never a squeezed two-pane layout.
import Wordmark from '@/components/public/Wordmark';
import { WobblyCheck, Sparkles } from '@/components/public/illustrations/marks';
import { LeaseSigning } from '@/components/public/illustrations/spots';

const PANEL_POINTS = [
  "Provincial compliance built in — starting with BC's RTB",
  'An append-only ledger your accountant will love',
  'A portal your tenants will actually use',
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,44%)_minmax(0,56%)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-deep p-10 text-ink-inverse lg:flex xl:p-14">
        <Wordmark tone="dark" />
        <div className="relative max-w-md">
          <div className="relative mb-10 inline-block">
            <LeaseSigning className="h-36 opacity-95" />
            <Sparkles className="absolute -right-10 -top-4 h-12 w-12 text-brand-bright" />
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            The paperwork side of renting, finally handled.
          </h1>
          <ul className="mt-8 space-y-4">
            {PANEL_POINTS.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-sm leading-6 text-ink-inverse-muted"
              >
                <WobblyCheck className="mt-1 h-4 w-4 shrink-0 text-brand-bright" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-ink-inverse-muted">
          Built in British Columbia for landlords across Canada.
        </p>
      </aside>

      <div className="flex flex-col px-4 py-8 sm:px-8">
        <div className="flex justify-center lg:hidden">
          <Wordmark />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
