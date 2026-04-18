import { BookOpen, Layers, BrainCircuit, Mic, MessageCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LogoMark from './LogoMark';
import Pill from './Pill';

export type Tab = 'vocabulary' | 'flashcards' | 'grammar' | 'pronunciation' | 'live';

type Props = {
  tab: Tab;
  setTab: (t: Tab) => void;
  languagePair?: { nativeFlag: string; targetFlag: string; onChange: () => void };
};

const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'vocabulary', label: 'Kelimeler', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'grammar', label: 'Dilbilgisi', icon: BrainCircuit },
  { id: 'pronunciation', label: 'Telaffuz', icon: Mic },
  { id: 'live', label: 'Canlı Pratik', icon: MessageCircle },
];

export default function Header({ tab, setTab, languagePair }: Props) {
  return (
    <header
      className="sticky top-0 z-10 border-b border-[var(--border)]"
      style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <h1 className="m-0 text-xl font-bold tracking-tight text-[var(--fg1)]">Umay</h1>
        </div>
        <nav className="hidden md:flex gap-1 items-center">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <Pill key={t.id} variant="nav" active={tab === t.id} onClick={() => setTab(t.id)}>
                <Icon style={{ width: 16, height: 16 }} strokeWidth={1.75} />
                {t.label}
              </Pill>
            );
          })}
          {languagePair && (
            <button
              type="button"
              onClick={languagePair.onChange}
              title="Change languages"
              className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--fg1)] hover:bg-[var(--bg)]"
            >
              <span>{languagePair.nativeFlag}</span>
              <span className="text-[var(--fg3)]">→</span>
              <span>{languagePair.targetFlag}</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
