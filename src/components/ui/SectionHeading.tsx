type Props = {
  title: string;
  subtitle?: string;
  className?: string;
};

export default function SectionHeading({ title, subtitle, className = '' }: Props) {
  return (
    <div className={className}>
      <h2 className="text-2xl font-semibold text-[var(--fg1)] tracking-tight m-0">{title}</h2>
      {subtitle && <p className="mt-1.5 text-sm text-[var(--fg2)] leading-relaxed m-0">{subtitle}</p>}
    </div>
  );
}
