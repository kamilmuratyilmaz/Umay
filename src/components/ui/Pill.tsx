import type { ReactNode } from 'react';

type Variant = 'category' | 'nav';
type Props = {
  active?: boolean;
  variant?: Variant;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
};

export default function Pill({ active = false, variant = 'category', onClick, className = '', children }: Props) {
  const base = 'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors';
  const cls = active
    ? variant === 'nav'
      ? 'bg-[var(--bg-sunken)] text-[var(--fg1)] border border-transparent'
      : 'bg-[var(--fg1)] text-white border border-[var(--fg1)] shadow-md'
    : variant === 'nav'
      ? 'bg-transparent text-[var(--fg2)] border border-transparent hover:text-[var(--fg1)] hover:bg-[var(--bg-sunken)]'
      : 'bg-[var(--bg-elev)] text-[var(--fg2)] border border-[var(--border)] hover:bg-[var(--bg-sunken)]';
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls} ${className}`}>
      {children}
    </button>
  );
}
