import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  hero?: boolean;
  sunken?: boolean;
  padding?: number;
  className?: string;
};

export default function Card({ children, hero = false, sunken = false, padding = 24, className = '' }: Props) {
  const bg = sunken ? 'bg-[var(--bg-sunken)]' : 'bg-[var(--bg-elev)]';
  const shadow = sunken ? '' : 'shadow-sm';
  return (
    <div
      className={`border border-[var(--border)] ${bg} ${shadow} ${className}`}
      style={{
        borderRadius: hero ? 32 : 24,
        padding,
        boxShadow: sunken ? 'var(--shadow-inner)' : undefined,
      }}
    >
      {children}
    </div>
  );
}
