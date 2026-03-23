import { useState } from 'react';
import { BookOpen, Mic, MessageCircle, BrainCircuit, Layers } from 'lucide-react';
import VocabularyList from './components/VocabularyList';
import GrammarHelper from './components/GrammarHelper';
import PronunciationChecker from './components/PronunciationChecker';
import LiveTutor from './components/LiveTutor';
import Flashcards from './components/Flashcards';

type Tab = 'vocabulary' | 'grammar' | 'pronunciation' | 'live' | 'flashcards';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('vocabulary');

  const renderContent = () => {
    switch (activeTab) {
      case 'vocabulary':
        return <VocabularyList />;
      case 'grammar':
        return <GrammarHelper />;
      case 'pronunciation':
        return <PronunciationChecker />;
      case 'live':
        return <LiveTutor />;
      case 'flashcards':
        return <Flashcards />;
      default:
        return <VocabularyList />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D2A26] font-sans selection:bg-[#C8102E]/10 selection:text-[#C8102E]">
      <header className="bg-white/80 backdrop-blur-md border-b border-[#EBE5D9] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C8102E] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm chinese-text">
              中
            </div>
            <h1 className="text-xl font-bold text-[#2D2A26] tracking-tight">Umay</h1>
          </div>
          <nav className="hidden md:flex space-x-1">
            {[
              { id: 'vocabulary', label: 'Kelimeler', icon: BookOpen },
              { id: 'flashcards', label: 'Flashcards', icon: Layers },
              { id: 'grammar', label: 'Dilbilgisi', icon: BrainCircuit },
              { id: 'pronunciation', label: 'Telaffuz', icon: Mic },
              { id: 'live', label: 'Canlı Pratik', icon: MessageCircle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#F2EFE9] text-[#2D2A26]'
                    : 'text-[#6B655B] hover:text-[#2D2A26] hover:bg-[#FDFBF7]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          {renderContent()}
        </div>
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-[#EBE5D9] pb-safe z-50">
        <div className="flex justify-around p-2">
          {[
            { id: 'vocabulary', label: 'Kelimeler', icon: BookOpen },
            { id: 'flashcards', label: 'Kartlar', icon: Layers },
            { id: 'grammar', label: 'Dilbilgisi', icon: BrainCircuit },
            { id: 'pronunciation', label: 'Telaffuz', icon: Mic },
            { id: 'live', label: 'Canlı', icon: MessageCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex flex-col items-center justify-center w-full py-2 space-y-1 rounded-xl transition-colors ${
                activeTab === tab.id
                  ? 'text-[#C8102E]'
                  : 'text-[#6B655B] hover:text-[#2D2A26] hover:bg-[#FDFBF7]'
              }`}
            >
              <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'fill-[#C8102E]/10' : ''}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
