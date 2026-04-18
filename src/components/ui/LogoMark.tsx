type Props = {
  size?: number;
  className?: string;
};

export default function LogoMark({ size = 40, className = '' }: Props) {
  return (
    <div
      className={`inline-flex items-center justify-center shadow-sm shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: 'var(--accent)',
      }}
    >
      <svg viewBox="0 0 120 120" width={size * 0.82} height={size * 0.82} aria-label="Umay">
        <g fill="#FDFBF7">
          <rect x="24" y="86" width="72" height="6" rx="3" />
          <path d="M 33 86 C 33 70, 36 58, 44 48 L 49 52 C 42 61, 39 72, 39 86 Z" />
          <path d="M 87 86 C 87 70, 84 58, 76 48 L 71 52 C 78 61, 81 72, 81 86 Z" />
          <rect x="56" y="34" width="8" height="54" rx="3" />
          <circle cx="60" cy="24" r="6" />
        </g>
      </svg>
    </div>
  );
}
