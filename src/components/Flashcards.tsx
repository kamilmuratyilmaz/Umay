import { useState, useEffect, useMemo } from 'react';
import { Volume2, Loader2, RotateCcw, Sparkles, CheckCircle2, XCircle, ArrowRight, Brain } from 'lucide-react';
import { VOCABULARY, VocabularyWord } from '../data/vocabulary';
import { generateSpeech } from '../lib/gemini';

interface CardProgress {
  hanzi: string;
  interval: number; // in days. 0 means learning.
  ease: number;
  nextReview: number; // timestamp
}

export default function Flashcards() {
  const [progress, setProgress] = useState<Record<string, CardProgress>>({});
  const [dueCards, setDueCards] = useState<VocabularyWord[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [audioLoading, setAudioLoading] = useState(false);

  // Load progress on mount
  useEffect(() => {
    const saved = localStorage.getItem('flashcard_progress');
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse flashcard progress", e);
      }
    }
  }, []);

  // Calculate due cards when progress or VOCABULARY changes
  useEffect(() => {
    const now = Date.now();
    const due = VOCABULARY.filter(word => {
      const cardProgress = progress[word.hanzi];
      if (!cardProgress) return true; // New card
      return cardProgress.nextReview <= now; // Due card
    });
    
    // Shuffle due cards
    const shuffled = [...due].sort(() => Math.random() - 0.5);
    setDueCards(shuffled);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, [progress]);

  const currentCard = dueCards[currentCardIndex];

  const handleRating = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard) return;

    const currentProgress = progress[currentCard.hanzi] || {
      hanzi: currentCard.hanzi,
      interval: 0,
      ease: 2.5,
      nextReview: 0
    };

    let { interval, ease } = currentProgress;
    let nextReviewDelay = 0; // in milliseconds

    switch (rating) {
      case 'again':
        interval = 0;
        ease = Math.max(1.3, ease - 0.2);
        nextReviewDelay = 1 * 60 * 1000; // 1 minute
        break;
      case 'hard':
        interval = Math.max(1, interval * 1.2);
        ease = Math.max(1.3, ease - 0.15);
        nextReviewDelay = 10 * 60 * 1000; // 10 minutes (if newish) or interval days
        if (currentProgress.interval > 0) {
          nextReviewDelay = interval * 24 * 60 * 60 * 1000;
        }
        break;
      case 'good':
        interval = Math.max(1, interval === 0 ? 1 : interval * ease);
        nextReviewDelay = interval * 24 * 60 * 60 * 1000; // interval days
        break;
      case 'easy':
        interval = Math.max(4, interval === 0 ? 4 : interval * ease * 1.3);
        ease = ease + 0.15;
        nextReviewDelay = interval * 24 * 60 * 60 * 1000; // interval days
        break;
    }

    const newProgress = {
      ...progress,
      [currentCard.hanzi]: {
        hanzi: currentCard.hanzi,
        interval,
        ease,
        nextReview: Date.now() + nextReviewDelay
      }
    };

    setProgress(newProgress);
    localStorage.setItem('flashcard_progress', JSON.stringify(newProgress));
    
    // Move to next card
    setIsFlipped(false);
    setCurrentCardIndex(prev => prev + 1);
  };

  const playAudio = async (text: string, category: string) => {
    try {
      setAudioLoading(true);
      const audioBufferData = await generateSpeech(text, 'Puck', category, false);
      
      if (!audioBufferData || audioBufferData.byteLength === 0) {
        throw new Error("Audio buffer is empty");
      }

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      try {
        const audioBuffer = await audioContext.decodeAudioData(audioBufferData.slice(0));
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
      } catch (e) {
        const int16Array = new Int16Array(audioBufferData);
        if (int16Array.length === 0) throw new Error("PCM array is empty");
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }
        const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
    } finally {
      setAudioLoading(false);
    }
  };

  if (dueCards.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#EBE5D9] p-10 text-center">
        <div className="w-24 h-24 bg-[#047857]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-[#047857]" />
        </div>
        <h2 className="text-3xl font-semibold text-[#2D2A26] mb-4">Tebrikler!</h2>
        <p className="text-[#6B655B] text-lg mb-8">Bugünlük tüm tekrarlarınızı tamamladınız.</p>
        <button 
          onClick={() => {
            // Reset progress for demo purposes
            if(window.confirm('Tüm ilerlemeyi sıfırlamak istediğinize emin misiniz?')) {
              localStorage.removeItem('flashcard_progress');
              setProgress({});
            }
          }}
          className="text-[#C8102E] hover:underline text-sm font-medium"
        >
          İlerlemeyi Sıfırla (Test İçin)
        </button>
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#2D2A26]/5 rounded-xl text-[#2D2A26]">
            <Brain className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-semibold text-[#2D2A26]">Akıllı Tekrar</h2>
        </div>
        <div className="text-sm font-medium text-[#6B655B] bg-[#FDFBF7] px-4 py-1.5 rounded-full border border-[#EBE5D9]">
          Kalan: {dueCards.length - currentCardIndex}
        </div>
      </div>

      {/* Flashcard */}
      <div 
        className={`relative w-full min-h-[400px] bg-white rounded-[2rem] shadow-sm border border-[#EBE5D9] p-8 md:p-12 flex flex-col items-center justify-center text-center transition-all duration-500 ${isFlipped ? 'bg-[#FDFBF7] shadow-inner' : 'hover:shadow-md cursor-pointer'}`}
        onClick={() => !isFlipped && setIsFlipped(true)}
      >
        <div className="absolute top-6 right-6">
          <button
            onClick={(e) => {
              e.stopPropagation();
              playAudio(currentCard.hanzi, currentCard.category);
            }}
            disabled={audioLoading}
            className="p-3.5 rounded-full bg-white text-[#2D2A26] hover:bg-[#F2EFE9] transition-colors disabled:opacity-50 border border-[#EBE5D9] shadow-sm"
          >
            {audioLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        <div className="text-7xl md:text-9xl font-medium text-[#2D2A26] mb-8 chinese-text leading-tight">
          {currentCard.hanzi}
        </div>

        {!isFlipped ? (
          <div className="absolute bottom-8 text-[#A39E93] text-sm font-medium flex items-center gap-2 animate-pulse">
            Cevabı görmek için karta tıklayın
          </div>
        ) : (
          <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-3xl text-[#C8102E] font-medium mb-4 tracking-wide">{currentCard.pinyin}</div>
            <div className="text-xl text-[#6B655B] mb-8">{currentCard.turkish}</div>

            {/* Example Sentence Section */}
            <div className="w-full mt-4 pt-6 border-t border-[#EBE5D9]">
              {currentCard.example_zh ? (
                <div className="text-left bg-white p-5 rounded-2xl border border-[#EBE5D9] shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xl text-[#2D2A26] chinese-text">{currentCard.example_zh}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playAudio(currentCard.example_zh!, currentCard.category);
                      }}
                      className="text-[#6B655B] hover:text-[#2D2A26] p-1"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[#6B655B] text-sm mb-1"><span className="font-medium text-[#2D2A26]">TR:</span> {currentCard.example_tr}</p>
                  <p className="text-[#6B655B] text-sm"><span className="font-medium text-[#2D2A26]">EN:</span> {currentCard.example_en}</p>
                </div>
              ) : (
                <p className="text-sm text-[#A39E93] italic">Örnek cümle bulunamadı.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {isFlipped && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            onClick={() => handleRating('again')}
            className="flex flex-col items-center justify-center py-4 bg-white border border-[#EBE5D9] rounded-2xl hover:bg-[#FEF2F2] hover:border-[#FECACA] hover:text-[#B91C1C] transition-colors group shadow-sm"
          >
            <span className="text-sm font-semibold text-[#2D2A26] group-hover:text-[#B91C1C] mb-1">Tekrar</span>
            <span className="text-xs text-[#A39E93] group-hover:text-[#F87171]">&lt; 1 dk</span>
          </button>
          <button
            onClick={() => handleRating('hard')}
            className="flex flex-col items-center justify-center py-4 bg-white border border-[#EBE5D9] rounded-2xl hover:bg-[#FFFBEB] hover:border-[#FDE68A] hover:text-[#92400E] transition-colors group shadow-sm"
          >
            <span className="text-sm font-semibold text-[#2D2A26] group-hover:text-[#92400E] mb-1">Zor</span>
            <span className="text-xs text-[#A39E93] group-hover:text-[#FBBF24]">10 dk</span>
          </button>
          <button
            onClick={() => handleRating('good')}
            className="flex flex-col items-center justify-center py-4 bg-white border border-[#EBE5D9] rounded-2xl hover:bg-[#F0FDF4] hover:border-[#BBF7D0] hover:text-[#166534] transition-colors group shadow-sm"
          >
            <span className="text-sm font-semibold text-[#2D2A26] group-hover:text-[#166534] mb-1">İyi</span>
            <span className="text-xs text-[#A39E93] group-hover:text-[#4ADE80]">1 gün</span>
          </button>
          <button
            onClick={() => handleRating('easy')}
            className="flex flex-col items-center justify-center py-4 bg-white border border-[#EBE5D9] rounded-2xl hover:bg-[#EFF6FF] hover:border-[#BFDBFE] hover:text-[#1E40AF] transition-colors group shadow-sm"
          >
            <span className="text-sm font-semibold text-[#2D2A26] group-hover:text-[#1E40AF] mb-1">Kolay</span>
            <span className="text-xs text-[#A39E93] group-hover:text-[#60A5FA]">4 gün</span>
          </button>
        </div>
      )}
    </div>
  );
}
