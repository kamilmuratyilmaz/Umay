import { MessageCircle, Phone } from 'lucide-react';
import Card from './ui/Card';
import HeroIconTile from './ui/HeroIconTile';
import SectionHeading from './ui/SectionHeading';
import { useLiveAPI } from '../hooks/useLiveAPI';
import { useLanguage } from '../context/LanguageContext';

export default function LiveTutor() {
  const { pair, t } = useLanguage();
  const { native, target } = pair!;
  const { connect, disconnect, isConnected, isConnecting, error } = useLiveAPI();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <HeroIconTile icon={MessageCircle} color="var(--color-jade)" tint="rgba(4,120,87,0.08)" />
        <SectionHeading title={t('live.title')} />
      </div>

      <Card hero padding={40} className="flex flex-col items-center gap-6 min-h-[360px] justify-center">
        {isConnected ? (
          <button
            type="button"
            onClick={disconnect}
            className="rounded-full text-white font-semibold px-8 py-4 flex items-center gap-3"
            style={{ background: 'var(--accent)', boxShadow: '0 4px 12px rgba(200,16,46,0.22)' }}
          >
            <Phone style={{ width: 18, height: 18 }} strokeWidth={1.75} />
            {t('live.endCall')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => connect({ native, target })}
            disabled={isConnecting}
            className="rounded-full text-white font-semibold px-8 py-4"
            style={{ background: 'var(--color-jade)', boxShadow: '0 4px 12px rgba(4,120,87,0.22)' }}
          >
            {isConnecting ? t('live.connecting') : t('live.connect')}
          </button>
        )}
        {error && <p className="m-0 text-sm text-[var(--color-rose)]">{error}</p>}
      </Card>
    </div>
  );
}
