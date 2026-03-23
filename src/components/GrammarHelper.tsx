import { useState } from 'react';
import { Send, Loader2, BrainCircuit } from 'lucide-react';
import { explainGrammar } from '../lib/gemini';
import ReactMarkdown from 'react-markdown';

export default function GrammarHelper() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse('');
    try {
      const result = await explainGrammar(query);
      setResponse(result);
    } catch (error) {
      console.error('Grammar explanation failed:', error);
      setResponse('Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-[#EBE5D9] p-6 md:p-10">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3.5 bg-[#2D2A26]/5 rounded-2xl text-[#2D2A26]">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-[#2D2A26]">Dilbilgisi Uzmanı</h2>
          <p className="text-[#6B655B] text-sm mt-1">Karmaşık Çince dilbilgisi kurallarını Türkçe açıklamalarla öğrenin.</p>
        </div>
      </div>

      <form onSubmit={handleAsk} className="mb-10">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Örn: 'ba' (把) yapısı nasıl kullanılır?"
            className="w-full pl-5 pr-16 py-4 bg-[#FDFBF7] border border-[#EBE5D9] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2D2A26]/20 focus:border-[#2D2A26] transition-all text-[#2D2A26] placeholder-[#A39E93] shadow-inner"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-[#2D2A26] hover:bg-[#1A1816] text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-[#A39E93] space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#2D2A26]" />
          <p className="text-sm font-medium animate-pulse">Yapay zeka derinlemesine düşünüyor...</p>
        </div>
      )}

      {response && !loading && (
        <div className="prose prose-slate max-w-none bg-[#FDFBF7] p-8 rounded-[2rem] border border-[#EBE5D9] text-[#2D2A26] prose-headings:text-[#2D2A26] prose-a:text-[#C8102E] prose-strong:text-[#2D2A26] shadow-inner">
          <ReactMarkdown>{response}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
