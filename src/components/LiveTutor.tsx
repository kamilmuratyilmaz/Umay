import { useLiveAPI } from '../hooks/useLiveAPI';
import { Mic, PhoneOff, Loader2, MessageCircle } from 'lucide-react';

export default function LiveTutor() {
  const { connect, disconnect, isConnected, isConnecting, error } = useLiveAPI();

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-[#EBE5D9] p-6 md:p-10">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3.5 bg-[#047857]/5 rounded-2xl text-[#047857]">
          <MessageCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-[#2D2A26]">Canlı Pratik</h2>
          <p className="text-[#6B655B] text-sm mt-1">Yapay zeka Çince öğretmeni ile gerçek zamanlı konuşun.</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-16 space-y-10">
        <div className="relative">
          <div className={`w-44 h-44 rounded-full flex items-center justify-center transition-all duration-500 ${
            isConnected 
              ? 'bg-[#047857]/10 shadow-[0_0_0_16px_rgba(4,120,87,0.05)] animate-pulse' 
              : 'bg-[#FDFBF7] border-2 border-[#EBE5D9] shadow-sm'
          }`}>
            {isConnecting ? (
              <Loader2 className="w-14 h-14 text-[#047857] animate-spin" />
            ) : isConnected ? (
              <Mic className="w-16 h-16 text-[#047857]" />
            ) : (
              <MessageCircle className="w-16 h-16 text-[#A39E93]" />
            )}
          </div>
        </div>

        <div className="text-center space-y-3">
          <h3 className="text-2xl font-medium text-[#2D2A26]">
            {isConnecting ? 'Bağlanıyor...' : isConnected ? 'Dinliyor...' : 'Sohbete Başla'}
          </h3>
          <p className="text-[#6B655B] max-w-sm mx-auto text-lg">
            {isConnected 
              ? 'Çince konuşmaya başlayın. Öğretmeniniz sizi dinliyor ve yanıt verecek.' 
              : 'Mikrofonunuzu açın ve yapay zeka ile Çince pratik yapmaya başlayın.'}
          </p>
        </div>

        <button
          onClick={() => (isConnected ? disconnect() : connect())}
          disabled={isConnecting}
          className={`px-10 py-4 rounded-full font-medium flex items-center gap-3 transition-all shadow-sm text-lg ${
            isConnected 
              ? 'bg-[#C8102E] hover:bg-[#A00D25] text-white shadow-[#C8102E]/20' 
              : 'bg-[#047857] hover:bg-[#065F46] text-white shadow-[#047857]/20'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isConnected ? (
            <>
              <PhoneOff className="w-6 h-6" />
              Aramayı Sonlandır
            </>
          ) : (
            <>
              <Mic className="w-6 h-6" />
              Bağlan
            </>
          )}
        </button>

        {error && (
          <div className="p-5 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
