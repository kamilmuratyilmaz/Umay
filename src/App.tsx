import { useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { LANG_META } from './i18n';
import Header, { type Tab } from './components/ui/Header';
import LanguagePicker from './components/LanguagePicker';
import VocabularyList from './components/VocabularyList';
import GrammarHelper from './components/GrammarHelper';
import PronunciationChecker from './components/PronunciationChecker';
import LiveTutor from './components/LiveTutor';
import Flashcards from './components/Flashcards';

function Shell() {
  const { pair, resetPair } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('vocabulary');

  if (!pair) return <LanguagePicker />;

  const renderContent = () => {
    switch (activeTab) {
      case 'vocabulary':    return <VocabularyList />;
      case 'grammar':       return <GrammarHelper />;
      case 'pronunciation': return <PronunciationChecker />;
      case 'live':          return <LiveTutor />;
      case 'flashcards':    return <Flashcards />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg1)] font-sans">
      <Header
        tab={activeTab}
        setTab={setActiveTab}
        languagePair={{
          nativeFlag: LANG_META[pair.native].flag,
          targetFlag: LANG_META[pair.target].flag,
          onChange: resetPair,
        }}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <Shell />
    </LanguageProvider>
  );
}
