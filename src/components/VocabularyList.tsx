import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Volume2, Snail, Loader2 } from 'lucide-react';
import Card from './ui/Card';
import Pill from './ui/Pill';
import IconButton from './ui/IconButton';
import SectionHeading from './ui/SectionHeading';
import { VOCABULARY, type VocabularyWord } from '../data/vocabulary';
import { useLanguage } from '../context/LanguageContext';
import { resolveAudioSource, type AudioField, type AudioSpeed } from '../lib/audioPlayer';
import type { LangCode } from '../i18n';

function scriptAndTranslation(row: VocabularyWord, native: LangCode, target: LangCode) {
  const map: Record<LangCode, string> = {
    zh: row.hanzi,
    tr: row.turkish,
    en: row.english ?? '',
  };
  const scriptField: AudioField = target === 'zh' ? 'hanzi' : target === 'en' ? 'english' : 'turkish';
  return {
    script: map[target],
    translation: map[native],
    pinyin: target === 'zh' ? row.pinyin : '',
    audioField: scriptField,
    isCjk: target === 'zh',
  };
}

export default function VocabularyList() {
  const { pair, t } = useLanguage();
  const { native, target } = pair!;

  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [playing, setPlaying] = useState<{ idx: number; slow: boolean } | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const cats = useMemo(
    () => ['all', ...Array.from(new Set(VOCABULARY.map(w => w.category).filter(Boolean)))],
    [],
  );

  const filtered = useMemo(() => {
    return VOCABULARY.filter(w => {
      if (cat !== 'all' && w.category !== cat) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      const { script, translation } = scriptAndTranslation(w, native, target);
      return script.toLowerCase().includes(s)
          || translation.toLowerCase().includes(s)
          || (target === 'zh' && w.pinyin.toLowerCase().includes(s));
    });
  }, [search, cat, native, target]);

  const play = async (row: VocabularyWord, idx: number, speed: AudioSpeed) => {
    const { audioField } = scriptAndTranslation(row, native, target);
    setPlaying({ idx, slow: speed === 'slow' });
    try {
      const src = await resolveAudioSource(row, audioField, speed, target);
      if (!src) { setPlaying(null); return; }
      if (!audioElRef.current) audioElRef.current = new Audio();
      if (src.kind === 'uri') {
        audioElRef.current.src = src.src;
      } else {
        audioElRef.current.src = URL.createObjectURL(new Blob([src.buffer], { type: 'audio/wav' }));
      }
      audioElRef.current.onended = () => setPlaying(null);
      await audioElRef.current.play();
    } catch (e) {
      console.error('Audio play failed', e);
      setPlaying(null);
    }
  };

  useEffect(() => () => { audioElRef.current?.pause(); audioElRef.current = null; }, []);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading title={t('vocab.title')} />

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg3)] pointer-events-none flex">
          <Search style={{ width: 18, height: 18 }} strokeWidth={1.75} />
        </span>
        <input
          type="search"
          name="vocab-search"
          aria-label={t('vocab.searchPh')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('vocab.searchPh')}
          className="w-full box-border py-3.5 pl-11 pr-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--fg1)] text-sm shadow-sm outline-none focus:border-[var(--accent)]"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {cats.map(c => (
          <Pill key={c} active={cat === c} onClick={() => setCat(c)}>
            {c === 'all' ? t('vocab.cat.all') : c}
          </Pill>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((w, i) => {
          const { script, translation, pinyin, isCjk } = scriptAndTranslation(w, native, target);
          const isPlayingNormal = playing?.idx === i && !playing.slow;
          const isPlayingSlow   = playing?.idx === i &&  playing.slow;
          return (
            <Card key={`${w.hanzi}-${i}`} className="flex items-center justify-between gap-4" padding={24}>
              <div className="min-w-0">
                <div
                  className={isCjk ? 'chinese-text' : ''}
                  style={{
                    fontSize: isCjk ? 36 : 26,
                    fontWeight: isCjk ? 500 : 600,
                    color: 'var(--fg1)', lineHeight: 1.1, marginBottom: 10,
                    letterSpacing: isCjk ? 0 : '-0.01em', wordBreak: 'break-word',
                  }}
                >
                  {script}
                </div>
                {pinyin && <div className="pinyin text-base mb-0.5">{pinyin}</div>}
                <div className="text-[15px] text-[var(--fg2)]">{translation}</div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <IconButton
                  icon={isPlayingNormal ? Loader2 : Volume2}
                  tone="ink"
                  loading={isPlayingNormal}
                  onClick={() => play(w, i, 'normal')}
                  title={t('vocab.playNormal')}
                />
                <IconButton
                  icon={isPlayingSlow ? Loader2 : Snail}
                  tone="stone"
                  loading={isPlayingSlow}
                  onClick={() => play(w, i, 'slow')}
                  title={t('vocab.playSlow')}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card padding={48} className="text-center">
          <p className="m-0 text-[var(--fg2)]">{t('vocab.empty')}</p>
        </Card>
      )}
    </div>
  );
}
