import type { LucideIcon } from 'lucide-react';

type Tone = 'ink' | 'stone' | 'onSurface';
type Props = {
  icon: LucideIcon;
  onClick?: () => void;
  tone?: Tone;
  size?: number;
  loading?: boolean;
  title?: string;
  className?: string;
};

export default function IconButton({ icon: Icon, onClick, tone = 'ink', size = 44, loading = false, title, className = '' }: Props) {
  const fg = tone === 'stone' ? 'text-[var(--fg2)]' : 'text-[var(--fg1)]';
  const bg = tone === 'onSurface' ? 'bg-[var(--bg-elev)]' : 'bg-[var(--bg)]';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center rounded-full border border-[var(--border)] shadow-xs transition-colors hover:bg-[var(--bg-sunken)] ${bg} ${fg} ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon className={loading ? 'animate-spin' : ''} style={{ width: 20, height: 20 }} strokeWidth={1.75} />
    </button>
  );
}
