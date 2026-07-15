import Link from 'next/link';
import { cn } from '@/lib/utils';

// The one brand mark. Header, footer, auth panel — same mark everywhere,
// tinted by `tone` for light or dark surfaces.
export default function Wordmark({
  tone = 'light',
  className,
}: {
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        'inline-flex items-center gap-2 transition-opacity hover:opacity-80',
        className
      )}
      aria-label="Rentium home"
    >
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md',
          tone === 'light' ? 'bg-brand text-white' : 'bg-brand-bright text-deep'
        )}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </span>
      <span
        className={cn(
          'text-[17px] font-semibold tracking-tight',
          tone === 'light' ? 'text-ink' : 'text-ink-inverse'
        )}
      >
        Rentium
      </span>
    </Link>
  );
}
