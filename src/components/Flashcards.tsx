import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, Loader2, CheckCircle2, Brain } from 'lucide-react';
import Card from './ui/Card';
import IconButton from './ui/IconButton';
import Eyebrow from './ui/Eyebrow';
import { VOCABULARY, type VocabularyWord } from '../data/vocabulary';
import { useLanguage } from '../context/LanguageContext';
import { resolveAudioSource, type AudioField, type AudioSpeed } from '../lib/audioPlayer';
import type { LangCode } from '../i18n';

interface CardProgress {
  hanzi: string;
  interval: number; // in days. 0 means learning.
  ease: number;
  nextReview: number; // timestamp
}

type Rating = 'again' | 'hard' | 'good' | 'easy';

function cardFaces(row: VocabularyWord, native: LangCode, target: LangCode) {
  const map: Record<LangCode, string> = {
    zh: row.hanzi,
    tr: row.turkish,
    en: row.english ?? '',
  };
  const audioField: AudioField = target === 'zh' ? 'hanzi' : target === 'en' ? 'english' : 'turkish';
  return {
    front: map[target],
    back: map[native],
    pinyin: target === 'zh' ? row.pinyin : '',
    audioField,
    isCjk: target === 'zh',
  };
}

export default function Flashcards() {
  const { pair, t } = useLanguage();
  const { native, target } = pair!;

  const [progress, setProgress] = useState<Record<string, CardProgress>>({});
  const [dueCards, setDueCards] = useState<VocabularyWord[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('flashcard_progress');
    if (saved) {
      try { setProgress(JSON.parse(saved)); }
      catch (e) { console.error('Failed to parse flashcard progress', e); }
    }
  }, []);

  useEffect(() => {
    const now = Date.now();
    const due = VOCABULARY.filter(word => {
      const p = progress[word.hanzi];
      if (!p) return true;
      return p.nextReview <= now;
    });
    const shuffled = [...due].sort(() => Math.random() - 0.5);
    setDueCards(shuffled);
    setCurrentIdx(0);
    setFlipped(false);
  }, [progress]);

  useEffect(() => () => { audioElRef.current?.pause(); audioElRef.current = null; }, []);

  const currentCard = dueCards[currentIdx];
  const faces = useMemo(
    () => (currentCard ? cardFaces(currentCard, native, target) : null),
    [currentCard, native, target],
  );

  const handleRating = (rating: Rating) => {
    if (!currentCard) return;
    const currentProgress = progress[currentCard.hanzi] || {
      hanzi: currentCard.hanzi, interval: 0, ease: 2.5, nextReview: 0,
    };

    let { interval, ease } = currentProgress;
    let nextReviewDelay = 0;

    switch (rating) {
      case 'again':
        interval = 0;
        ease = Math.max(1.3, ease - 0.2);
        nextReviewDelay = 60 * 1000;
        break;
      case 'hard':
        interval = Math.max(1, interval * 1.2);
        ease = Math.max(1.3, ease - 0.15);
        nextReviewDelay = currentProgress.interval > 0
          ? interval * 24 * 60 * 60 * 1000
          : 10 * 60 * 1000;
        break;
      case 'good':
        interval = Math.max(1, interval === 0 ? 1 : interval * ease);
        nextReviewDelay = interval * 24 * 60 * 60 * 1000;
        break;
      case 'easy':
        interval = Math.max(4, interval === 0 ? 4 : interval * ease * 1.3);
        ease = ease + 0.15;
        nextReviewDelay = interval * 24 * 60 * 60 * 1000;
        break;
    }

    const newProgress = {
      ...progress,
      [currentCard.hanzi]: {
        hanzi: currentCard.hanzi,
        interval, ease,
        nextReview: Date.now() + nextReviewDelay,
      },
    };
    setProgress(newProgress);
    localStorage.setItem('flashcard_progress', JSON.stringify(newProgress));
    setFlipped(false);
    setCurrentIdx(prev => prev + 1);
  };

  const play = async (row: VocabularyWord, field: AudioField, speed: AudioSpeed = 'normal') => {
    setAudioLoading(true);
    try {
      const src = await resolveAudioSource(row, field, speed, target);
      if (!src) { setAudioLoading(false); return; }
      if (!audioElRef.current) audioElRef.current = new Audio();
      if (src.kind === 'uri') {
        audioElRef.current.src = src.src;
      } else {
        audioElRef.current.src = URL.createObjectURL(new Blob([src.buffer], { type: 'audio/wav' }));
      }
      audioElRef.current.onended = () => setAudioLoading(false);
      await audioElRef.current.play();
    } catch (e) {
      console.error('Audio play failed', e);
      setAudioLoading(false);
    }
  };

  if (dueCards.length === 0) {
    return (
      <Card padding={48} className="text-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(4,120,87,0.1)' }}>
          <CheckCircle2 className="w-12 h-12" style={{ color: 'var(--color-jade)' }} />
        </div>
        <h2 className="text-3xl font-semibold text-[var(--fg1)] mb-4">{t('flash.allDone')}</h2>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t('flash.resetConfirm'))) {
              localStorage.removeItem('flashcard_progress');
              setProgress({});
            }
          }}
          className="text-[var(--accent)] hover:underline text-sm font-medium"
        >
          {t('flash.reset')}
        </button>
      </Card>
    );
  }

  if (!currentCard || !faces) return null;

  const exampleScriptField: AudioField = target === 'zh' ? 'example_zh' : target === 'en' ? 'example_en' : 'example_tr';
  const exampleMap: Record<LangCode, string | undefined> = {
    zh: currentCard.example_zh,
    tr: currentCard.example_tr,
    en: currentCard.example_en,
  };
  const exampleFront = exampleMap[target];
  const exampleBack = exampleMap[native];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl text-[var(--fg1)]" style={{ background: 'rgba(45,42,38,0.05)' }}>
            <Brain className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--fg1)]">{t('flash.title')}</h2>
        </div>
        <div className="text-sm font-medium text-[var(--fg2)] bg-[var(--bg)] px-4 py-1.5 rounded-full border border-[var(--border)]">
          {t('flash.remaining')}: {dueCards.length - currentIdx}
        </div>
      </div>

      <div
        className={`relative cursor-pointer transition-all duration-500 ${flipped ? '' : 'hover:shadow-md'}`}
        onClick={() => !flipped && setFlipped(true)}
      >
        <Card hero padding={40} sunken={flipped} className="min-h-[400px] flex flex-col items-center justify-center text-center">
          <div className="absolute top-6 right-6">
            <IconButton
              icon={audioLoading ? Loader2 : Volume2}
              loading={audioLoading}
              onClick={() => play(currentCard, faces.audioField)}
              tone="ink"
              title={t('vocab.playNormal')}
            />
          </div>

          <div
            className={faces.isCjk ? 'chinese-text' : ''}
            style={{
              fontSize: faces.isCjk ? 128 : 72,
              fontWeight: 500,
              lineHeight: 1.1,
              color: 'var(--fg1)',
              marginBottom: 32,
              letterSpacing: faces.isCjk ? 0 : '-0.02em',
              wordBreak: 'break-word',
            }}
          >
            {faces.front}
          </div>

          {!flipped ? (
            <Eyebrow>{t('flash.flipPrompt')}</Eyebrow>
          ) : (
            <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              {faces.pinyin && (
                <div className="pinyin text-3xl mb-4 text-[var(--accent)]">{faces.pinyin}</div>
              )}
              <div className="text-xl text-[var(--fg2)] mb-8">{faces.back}</div>

              {exampleFront && (
                <div className="w-full mt-4 pt-6 border-t border-[var(--border)]">
                  <Card padding={20} className="text-left">
                    <div className="flex justify-between items-start mb-2 gap-3">
                      <p className={`${target === 'zh' ? 'chinese-text text-xl' : 'text-lg'} m-0 text-[var(--fg1)]`}>
                        {exampleFront}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          play(currentCard, exampleScriptField);
                        }}
                        className="text-[var(--fg2)] hover:text-[var(--fg1)] p-1"
                      >
                        <Volume2 className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                    </div>
                    {exampleBack && (
                      <p className="text-[var(--fg2)] text-sm m-0">{exampleBack}</p>
                    )}
                  </Card>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {flipped && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            type="button"
            onClick={() => handleRating('again')}
            className="rounded-2xl py-3 font-semibold text-white"
            style={{ background: 'var(--color-rose)' }}
          >
            {t('flash.again')}
          </button>
          <button
            type="button"
            onClick={() => handleRating('hard')}
            className="rounded-2xl py-3 font-semibold text-white"
            style={{ background: 'var(--color-amber)' }}
          >
            {t('flash.hard')}
          </button>
          <button
            type="button"
            onClick={() => handleRating('good')}
            className="rounded-2xl py-3 font-semibold text-white"
            style={{ background: 'var(--color-jade)' }}
          >
            {t('flash.good')}
          </button>
          <button
            type="button"
            onClick={() => handleRating('easy')}
            className="rounded-2xl py-3 font-semibold text-white"
            style={{ background: 'var(--color-lapis-info)' }}
          >
            {t('flash.easy')}
          </button>
        </div>
      )}
    </div>
  );
}
