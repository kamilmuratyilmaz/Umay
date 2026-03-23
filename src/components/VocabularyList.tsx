import { useState, useMemo } from 'react';
import { Volume2, Loader2, Search, ChevronLeft, ChevronRight, Snail } from 'lucide-react';
import { generateSpeech } from '../lib/gemini';
import { VOCABULARY } from '../data/vocabulary';

const CATEGORY_MAP: Record<string, string> = {
  'greetings': 'Selamlaşma',
  'self-introduction': 'Kendini Tanıtma',
  'places': 'Mekanlar',
  'jobs': 'Meslekler',
  'shopping': 'Alışveriş',
  'activities': 'Aktiviteler',
  'food': 'Yemek',
  'family': 'Aile',
  'colors': 'Renkler',
  'fruits': 'Meyveler',
  'dates-time': 'Tarih ve Zaman',
  'numbers': 'Sayılar',
  'emotions': 'Duygular',
  'sports': 'Spor',
  'descriptive': 'Sıfatlar',
  'countries': 'Ülkeler',
  'animals': 'Hayvanlar',
  'nature-weather': 'Doğa ve Hava',
  'household': 'Ev Eşyaları',
  'clothing': 'Giyim',
  'hotel': 'Otel',
  'directions': 'Yönler',
  'taxi': 'Taksi',
  'airport': 'Havalimanı',
  'apps': 'Uygulamalar'
};

const ITEMS_PER_PAGE = 12;

export default function VocabularyList() {
  const [loadingState, setLoadingState] = useState<{ index: number, type: 'normal' | 'slow' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [currentPage, setCurrentPage] = useState(1);

  const categories = useMemo(() => {
    const cats = new Set(VOCABULARY.map(w => w.category));
    return ['Tümü', ...Array.from(cats)];
  }, []);

  const filteredVocabulary = useMemo(() => {
    let filtered = VOCABULARY;
    
    if (selectedCategory !== 'Tümü') {
      filtered = filtered.filter(word => word.category === selectedCategory);
    }
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (word) =>
          word.hanzi.includes(lowerSearch) ||
          word.pinyin.toLowerCase().includes(lowerSearch) ||
          word.turkish.toLowerCase().includes(lowerSearch)
      );
    }
    
    return filtered;
  }, [searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredVocabulary.length / ITEMS_PER_PAGE);
  const currentItems = filteredVocabulary.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to first page when searching or changing category
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const playAudio = async (text: string, index: number, category: string, isSlow: boolean = false) => {
    try {
      setLoadingState({ index, type: isSlow ? 'slow' : 'normal' });
      const audioBufferData = await generateSpeech(text, 'Puck', category, isSlow);
      
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
        // Fallback to raw PCM16
        const int16Array = new Int16Array(audioBufferData);
        if (int16Array.length === 0) {
           throw new Error("PCM array is empty");
        }
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
      alert('Ses çalınamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoadingState(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#2D2A26]">Temel Kelimeler</h2>
        <p className="text-[#6B655B] mt-1">Çince karakterleri, okunuşlarını ve Türkçe anlamlarını öğrenin.</p>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-[#A39E93]" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-4 py-3.5 border border-[#EBE5D9] rounded-2xl leading-5 bg-white placeholder-[#A39E93] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E] sm:text-sm transition-all shadow-sm"
          placeholder="Çince, Pinyin veya Türkçe ara..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      <div className="flex overflow-x-auto pb-2 -mx-2 px-2 space-x-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
              selectedCategory === category
                ? 'bg-[#2D2A26] text-white shadow-md'
                : 'bg-white text-[#6B655B] border border-[#EBE5D9] hover:bg-[#F2EFE9] hover:text-[#2D2A26]'
            }`}
          >
            {category === 'Tümü' ? 'Tümü' : CATEGORY_MAP[category] || category}
          </button>
        ))}
      </div>
      
      {currentItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {currentItems.map((word, index) => (
            <div key={`${word.hanzi}-${index}`} className="bg-white p-6 rounded-3xl shadow-sm border border-[#EBE5D9] flex items-center justify-between hover:shadow-md transition-all group">
              <div>
                <div className="text-4xl font-medium text-[#2D2A26] mb-3 chinese-text">{word.hanzi}</div>
                <div className="text-lg text-[#C8102E] font-medium tracking-wide">{word.pinyin}</div>
                <div className="text-[#6B655B] mt-1">{word.turkish}</div>
              </div>
              <div className="flex flex-col space-y-2 ml-4 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => playAudio(word.hanzi, index, word.category, false)}
                  disabled={loadingState?.index === index}
                  className="p-3.5 rounded-full bg-[#FDFBF7] text-[#2D2A26] hover:bg-[#F2EFE9] transition-colors disabled:opacity-50 border border-[#EBE5D9]"
                  aria-label="Normal Dinle"
                  title="Normal Dinle"
                >
                  {loadingState?.index === index && loadingState?.type === 'normal' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => playAudio(word.hanzi, index, word.category, true)}
                  disabled={loadingState?.index === index}
                  className="p-3.5 rounded-full bg-[#FDFBF7] text-[#6B655B] hover:bg-[#F2EFE9] transition-colors disabled:opacity-50 border border-[#EBE5D9]"
                  aria-label="Yavaş Dinle"
                  title="Yavaş Dinle"
                >
                  {loadingState?.index === index && loadingState?.type === 'slow' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Snail className="w-5 h-5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#EBE5D9]">
          <p className="text-[#6B655B]">Aramanızla eşleşen kelime bulunamadı.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-[#EBE5D9] rounded-2xl sm:px-6 shadow-sm">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-xl border border-[#EBE5D9] bg-white px-4 py-2 text-sm font-medium text-[#2D2A26] hover:bg-[#FDFBF7] disabled:opacity-50"
            >
              Önceki
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-xl border border-[#EBE5D9] bg-white px-4 py-2 text-sm font-medium text-[#2D2A26] hover:bg-[#FDFBF7] disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[#6B655B]">
                Toplam <span className="font-medium text-[#2D2A26]">{filteredVocabulary.length}</span> kelimeden{' '}
                <span className="font-medium text-[#2D2A26]">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> -{' '}
                <span className="font-medium text-[#2D2A26]">{Math.min(currentPage * ITEMS_PER_PAGE, filteredVocabulary.length)}</span> arası gösteriliyor
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-[#A39E93] ring-1 ring-inset ring-[#EBE5D9] hover:bg-[#FDFBF7] focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Önceki</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-[#2D2A26] ring-1 ring-inset ring-[#EBE5D9] focus:outline-offset-0 bg-white">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-[#A39E93] ring-1 ring-inset ring-[#EBE5D9] hover:bg-[#FDFBF7] focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Sonraki</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
