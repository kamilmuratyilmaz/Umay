import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  color?: string;
  tint?: string;
  className?: string;
};

export default function HeroIconTile({ icon: Icon, color = 'var(--fg1)', tint = 'rgba(45,42,38,0.05)', className = '' }: Props) {
  return (
    <div className={`inline-flex ${className}`} style={{ padding: 14, background: tint, borderRadius: 18, color }}>
      <Icon style={{ width: 24, height: 24 }} strokeWidth={1.75} />
    </div>
  );
}
