import { useState } from 'react';
import LogoMark from './ui/LogoMark';
import Eyebrow from './ui/Eyebrow';
import { LANG_META, type LangCode } from '../i18n';
import { useLanguage } from '../context/LanguageContext';

const LANGS: LangCode[] = ['tr', 'en', 'zh'];

const V2_PAIRS: Array<{ native: LangCode; target: LangCode }> = [
  { native: 'zh', target: 'tr' },
  { native: 'en', target: 'tr' },
];

function isV2(native: LangCode, target: LangCode) {
  return V2_PAIRS.some(p => p.native === native && p.target === target);
}

function LangCard({
  code, selected, disabled, note, onClick,
}: { code: LangCode; selected: boolean; disabled: boolean; note?: string; onClick: () => void }) {
  const meta = LANG_META[code];
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex flex-col items-start gap-2 text-left rounded-[20px] px-5 py-5 min-h-[120px] border transition-all ${
        selected
          ? 'bg-[var(--fg1)] text-white border-[var(--fg1)] shadow-md'
          : disabled
          ? 'bg-[var(--bg-elev)] text-[var(--fg3)] border-[var(--border)] opacity-40 cursor-not-allowed'
          : 'bg-[var(--bg-elev)] text-[var(--fg1)] border-[var(--border)] shadow-sm hover:border-[var(--fg2)]'
      }`}
    >
      <span className="text-3xl leading-none">{meta.flag}</span>
      <span className="text-[17px] font-semibold tracking-tight">{meta.name}</span>
      <span className={`text-xs font-semibold uppercase tracking-[0.08em] ${selected ? 'text-white/65' : 'text-[var(--fg3)]'}`}>
        {meta.english}
      </span>
      {note && <span className={`text-xs ${selected ? 'text-white/80' : 'text-[var(--fg3)]'}`}>{note}</span>}
    </button>
  );
}

export default function LanguagePicker() {
  const { setPair, t } = useLanguage();
  const [step, setStep] = useState<1 | 2>(1);
  const [native, setNative] = useState<LangCode | null>(null);
  const [target, setTarget] = useState<LangCode | null>(null);

  const finish = () => {
    if (native && target) setPair({ native, target });
  };

  const stepT = (k: string) => t(k);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center px-8 pt-14 pb-20">
      <div className="flex items-center gap-3 mb-12">
        <LogoMark size={48} />
        <h1 className="m-0 text-[26px] font-bold tracking-tight text-[var(--fg1)]">Umay</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {[1, 2].map(n => (
          <span
            key={n}
            className="h-2 rounded-full transition-all duration-200"
            style={{
              width: n === step ? 28 : 8,
              background: n <= step ? 'var(--accent)' : 'var(--border)',
            }}
          />
        ))}
      </div>

      <div className="max-w-[720px] w-full text-center mb-10">
        <Eyebrow>{stepT(step === 1 ? 'picker.step1.eyebrow' : 'picker.step2.eyebrow')}</Eyebrow>
        <h2 className="mt-2.5 mb-2 text-[32px] font-semibold tracking-tight text-[var(--fg1)]">
          {stepT(step === 1 ? 'picker.step1.title' : 'picker.step2.title')}
        </h2>
        <p className="m-0 text-[15px] text-[var(--fg2)]">
          {stepT(step === 1 ? 'picker.step1.sub' : 'picker.step2.sub')}
        </p>
      </div>

      <div className="max-w-[720px] w-full grid grid-cols-3 gap-3.5 mb-8">
        {LANGS.map(code => {
          if (step === 1) {
            return (
              <LangCard
                key={code}
                code={code}
                selected={native === code}
                disabled={false}
                onClick={() => setNative(code)}
              />
            );
          }
          const sameAsNative = code === native;
          const v2 = native ? isV2(native, code) : false;
          return (
            <LangCard
              key={code}
              code={code}
              selected={target === code}
              disabled={sameAsNative || v2}
              note={v2 ? stepT('picker.comingSoon') : undefined}
              onClick={() => setTarget(code)}
            />
          );
        })}
      </div>

      <div className="max-w-[720px] w-full flex justify-between items-center">
        <button
          type="button"
          onClick={() => step === 2 && setStep(1)}
          disabled={step === 1}
          className={`bg-transparent border-0 px-0 py-2.5 text-sm font-medium ${
            step === 1 ? 'text-[var(--fg3)] cursor-default' : 'text-[var(--fg2)] cursor-pointer'
          }`}
        >
          ← {stepT('picker.back')}
        </button>
        <button
          type="button"
          onClick={() => (step === 1 ? (native && setStep(2)) : (target && finish()))}
          disabled={step === 1 ? !native : !target}
          className="rounded-full px-8 py-3.5 text-[15px] font-semibold text-white border-0"
          style={{
            background: 'var(--accent)',
            opacity: (step === 1 ? !native : !target) ? 0.35 : 1,
            boxShadow: '0 4px 12px rgba(200,16,46,0.22)',
          }}
        >
          {stepT('picker.cta')} →
        </button>
      </div>
    </div>
  );
}
