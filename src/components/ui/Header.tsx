import { BookOpen, Layers, BrainCircuit, Mic, MessageCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LogoMark from './LogoMark';
import Pill from './Pill';
import { useLanguage } from '../../context/LanguageContext';

export type Tab = 'vocabulary' | 'flashcards' | 'grammar' | 'pronunciation' | 'live';

type Props = {
  tab: Tab;
  setTab: (t: Tab) => void;
  languagePair?: { nativeFlag: string; targetFlag: string; onChange: () => void };
};

const TABS: Array<{ id: Tab; i18nKey: string; icon: LucideIcon }> = [
  { id: 'vocabulary', i18nKey: 'tab.vocabulary', icon: BookOpen },
  { id: 'flashcards', i18nKey: 'tab.flashcards', icon: Layers },
  { id: 'grammar', i18nKey: 'tab.grammar', icon: BrainCircuit },
  { id: 'pronunciation', i18nKey: 'tab.pronunciation', icon: Mic },
  { id: 'live', i18nKey: 'tab.live', icon: MessageCircle },
];

export default function Header({ tab, setTab, languagePair }: Props) {
  const { t } = useLanguage();
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
          {TABS.map(tabDef => {
            const Icon = tabDef.icon;
            return (
              <Pill key={tabDef.id} variant="nav" active={tab === tabDef.id} onClick={() => setTab(tabDef.id)}>
                <Icon style={{ width: 16, height: 16 }} strokeWidth={1.75} />
                {t(tabDef.i18nKey)}
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
