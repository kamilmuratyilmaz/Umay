import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Square, CheckCircle2, XCircle, Loader2, RefreshCw, Volume2, Snail } from 'lucide-react';
import Card from './ui/Card';
import IconButton from './ui/IconButton';
import HeroIconTile from './ui/HeroIconTile';
import SectionHeading from './ui/SectionHeading';
import Eyebrow from './ui/Eyebrow';
import { evaluatePronunciation } from '../lib/gemini';
import { VOCABULARY, type VocabularyWord } from '../data/vocabulary';
import { useLanguage } from '../context/LanguageContext';
import { resolveAudioSource, type AudioField, type AudioSpeed } from '../lib/audioPlayer';
import type { LangCode } from '../i18n';

interface EvaluationResult {
  score: number;
  feedback: string;
  transcription: string;
}

// Add a LangCode here to hide the pronunciation tab for that target (e.g. if Gemini's eval quality is poor).
const PRONUNCIATION_UNSUPPORTED: LangCode[] = [];

function targetText(row: VocabularyWord, target: LangCode): string {
  if (target === 'zh') return row.hanzi;
  if (target === 'en') return row.english ?? '';
  return row.turkish;
}

function translationText(row: VocabularyWord, native: LangCode): string {
  if (native === 'zh') return row.hanzi;
  if (native === 'en') return row.english ?? '';
  return row.turkish;
}

function targetAudioField(target: LangCode): AudioField {
  return target === 'zh' ? 'hanzi' : target === 'en' ? 'english' : 'turkish';
}

export default function PronunciationChecker() {
  const { pair, t } = useLanguage();
  const { native, target } = pair!;

  const supported = !PRONUNCIATION_UNSUPPORTED.includes(target);

  const candidates = useMemo(
    () => VOCABULARY.filter(w => (target === 'zh' ? !!w.hanzi : target === 'en' ? !!w.english : !!w.turkish)),
    [target],
  );

  const [targetWord, setTargetWord] = useState<VocabularyWord>(candidates[0] ?? VOCABULARY[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioLoadingState, setAudioLoadingState] = useState<AudioSpeed | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const pickRandomWord = () => {
    if (candidates.length === 0) return;
    const idx = Math.floor(Math.random() * candidates.length);
    setTargetWord(candidates[idx]);
    setResult(null);
  };

  useEffect(() => { pickRandomWord(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [target]);
  useEffect(() => () => { audioElRef.current?.pause(); audioElRef.current = null; }, []);

  const playTargetAudio = async (speed: AudioSpeed) => {
    if (!supported) return;
    setAudioLoadingState(speed);
    try {
      const src = await resolveAudioSource(targetWord, targetAudioField(target), speed, target);
      if (!src) { setAudioLoadingState(null); return; }
      if (!audioElRef.current) audioElRef.current = new Audio();
      if (src.kind === 'uri') {
        audioElRef.current.src = src.src;
      } else {
        audioElRef.current.src = URL.createObjectURL(new Blob([src.buffer], { type: 'audio/wav' }));
      }
      audioElRef.current.onended = () => setAudioLoadingState(null);
      await audioElRef.current.play();
    } catch (e) {
      console.error('Failed to play audio:', e);
      setAudioLoadingState(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          setLoading(true);
          try {
            const evalResult = await evaluatePronunciation(
              base64data,
              'audio/webm',
              targetText(targetWord, target),
              target === 'zh' ? targetWord.pinyin : '',
              native,
              target,
            );
            setResult(evalResult);
          } catch (error) {
            console.error('Evaluation failed:', error);
            setResult({ score: 0, feedback: t('common.error'), transcription: '' });
          } finally {
            setLoading(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setResult(null);
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  if (!supported) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <HeroIconTile icon={Mic} color="var(--accent)" tint="rgba(200,16,46,0.08)" />
          <SectionHeading title={t('pron.title')} />
        </div>
        <Card padding={48} className="text-center">
          <p className="m-0 text-[var(--fg2)]">{t('picker.comingSoon')}</p>
        </Card>
      </div>
    );
  }

  const isMatch = result && result.score >= 80;
  const script = targetText(targetWord, target);
  const translation = translationText(targetWord, native);
  const isCjk = target === 'zh';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <HeroIconTile icon={Mic} color="var(--accent)" tint="rgba(200,16,46,0.08)" />
        <SectionHeading title={t('pron.title')} />
      </div>

      <Card hero padding={40} sunken className="text-center relative">
        <div className="absolute top-6 right-6 flex gap-2">
          <IconButton
            icon={audioLoadingState === 'normal' ? Loader2 : Volume2}
            loading={audioLoadingState === 'normal'}
            onClick={() => playTargetAudio('normal')}
            tone="ink"
            title={t('vocab.playNormal')}
          />
          <IconButton
            icon={audioLoadingState === 'slow' ? Loader2 : Snail}
            loading={audioLoadingState === 'slow'}
            onClick={() => playTargetAudio('slow')}
            tone="stone"
            title={t('vocab.playSlow')}
          />
        </div>

        <Eyebrow>{t('pron.targetLabel')}</Eyebrow>

        <div
          className={isCjk ? 'chinese-text' : ''}
          style={{
            fontSize: isCjk ? 96 : 56,
            fontWeight: 500,
            color: 'var(--fg1)',
            lineHeight: 1.1,
            marginTop: 16,
            marginBottom: 16,
            wordBreak: 'break-word',
          }}
        >
          {script}
        </div>

        {target === 'zh' && targetWord.pinyin && (
          <div className="pinyin text-2xl mb-3 text-[var(--accent)]">{targetWord.pinyin}</div>
        )}
        <div className="text-lg text-[var(--fg2)]">{translation}</div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={pickRandomWord}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] text-sm font-medium text-[var(--fg1)] shadow-sm"
          >
            <RefreshCw style={{ width: 14, height: 14 }} strokeWidth={1.75} />
            {t('pron.newWord')}
          </button>
        </div>
      </Card>

      <div className="flex flex-col items-center gap-4 my-6">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          className="rounded-full flex items-center justify-center transition-shadow duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            width: 96,
            height: 96,
            background: isRecording ? 'var(--accent)' : 'var(--bg-elev)',
            color: isRecording ? 'white' : 'var(--accent)',
            border: isRecording ? 'none' : '2px solid var(--border)',
            boxShadow: isRecording ? 'var(--halo-accent)' : 'var(--shadow-sm)',
          }}
        >
          {loading ? (
            <Loader2 style={{ width: 36, height: 36 }} strokeWidth={1.75} className="animate-spin" />
          ) : isRecording ? (
            <Square style={{ width: 36, height: 36 }} strokeWidth={1.75} />
          ) : (
            <Mic style={{ width: 40, height: 40 }} strokeWidth={1.75} />
          )}
        </button>
        <p className="text-sm font-medium text-[var(--fg2)]">
          {isRecording ? t('pron.recording') : t('pron.micPrompt')}
        </p>
      </div>

      {result && !loading && (
        <Card hero padding={32}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div
              className="flex items-center justify-center w-24 h-24 rounded-full shrink-0 bg-[var(--bg-elev)] border shadow-sm"
              style={{ borderColor: isMatch ? 'var(--color-jade)' : 'var(--color-amber)' }}
            >
              <span
                className="text-4xl font-bold"
                style={{ color: isMatch ? 'var(--color-jade)' : 'var(--color-amber)' }}
              >
                {result.score}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                {isMatch ? (
                  <CheckCircle2 className="w-7 h-7 shrink-0" style={{ color: 'var(--color-jade)' }} />
                ) : (
                  <XCircle className="w-7 h-7 shrink-0" style={{ color: 'var(--color-amber)' }} />
                )}
                <h3
                  className="text-xl font-semibold"
                  style={{ color: isMatch ? 'var(--color-jade)' : 'var(--color-amber)' }}
                >
                  {isMatch ? t('pron.great') : t('pron.tryAgain')}
                </h3>
              </div>
              <p className="text-lg mb-5 leading-relaxed text-[var(--fg1)]">{result.feedback}</p>
              {result.transcription && (
                <div className="bg-[var(--bg-sunken)] rounded-xl p-4 text-sm border border-[var(--border)]">
                  <span className="text-[var(--fg2)]">{t('pron.youSaid')}:</span>
                  <span className={`font-medium text-[var(--fg1)] ml-2 text-lg ${isCjk ? 'chinese-text' : ''}`}>
                    {result.transcription}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
