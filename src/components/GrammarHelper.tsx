import { useState } from 'react';
import { Send, Loader2, BrainCircuit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Card from './ui/Card';
import HeroIconTile from './ui/HeroIconTile';
import SectionHeading from './ui/SectionHeading';
import { useLanguage } from '../context/LanguageContext';
import { explainGrammar } from '../lib/gemini';

export default function GrammarHelper() {
  const { pair, t } = useLanguage();
  const { native, target } = pair!;
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!query.trim()) return;
    setLoading(true); setAnswer(''); setError(null);
    try {
      const text = await explainGrammar(query.trim(), native, target);
      setAnswer(text);
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <HeroIconTile icon={BrainCircuit} color="var(--fg1)" tint="rgba(45,42,38,0.05)" />
        <SectionHeading title={t('grammar.title')} />
      </div>

      <Card hero padding={32}>
        <div className="flex gap-3 items-center">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder={t('grammar.prompt')}
            className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-5 py-3 text-base outline-none focus:border-[var(--accent)]"
            style={{ boxShadow: 'var(--shadow-inner)' }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="rounded-full px-5 py-3 text-white flex items-center gap-2"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} /> : <Send style={{ width: 18, height: 18 }} />}
          </button>
        </div>

        {loading && (
          <p className="mt-6 text-sm text-[var(--fg2)] flex items-center gap-2">
            <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
            {t('grammar.loading')}
          </p>
        )}

        {error && <p className="mt-6 text-sm text-[var(--color-rose)]">{error}</p>}

        {answer && (
          <div className="prose max-w-none mt-6">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        )}
      </Card>
    </div>
  );
}
