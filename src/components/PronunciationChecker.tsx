import { useState, useRef, useEffect } from 'react';
import { Mic, Square, CheckCircle2, XCircle, Loader2, RefreshCw, Volume2, Snail } from 'lucide-react';
import { evaluatePronunciation, generateSpeech } from '../lib/gemini';
import { VOCABULARY, VocabularyWord } from '../data/vocabulary';

interface EvaluationResult {
  score: number;
  feedback: string;
  transcription: string;
}

export default function PronunciationChecker() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioLoadingState, setAudioLoadingState] = useState<'normal' | 'slow' | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [targetWord, setTargetWord] = useState<VocabularyWord>(VOCABULARY[0]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const pickRandomWord = () => {
    const randomIndex = Math.floor(Math.random() * VOCABULARY.length);
    setTargetWord(VOCABULARY[randomIndex]);
    setResult(null);
  };

  useEffect(() => {
    pickRandomWord();
  }, []);

  const playTargetAudio = async (isSlow: boolean = false) => {
    try {
      setAudioLoadingState(isSlow ? 'slow' : 'normal');
      const audioBufferData = await generateSpeech(targetWord.hanzi, 'Puck', targetWord.category, isSlow);
      
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
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          setLoading(true);
          try {
            const evalResult = await evaluatePronunciation(base64data, 'audio/webm', targetWord.hanzi, targetWord.pinyin);
            setResult(evalResult);
          } catch (error) {
            console.error('Evaluation failed:', error);
            setResult({
              score: 0,
              feedback: 'Değerlendirme yapılamadı. Lütfen tekrar deneyin.',
              transcription: 'Anlaşılamadı'
            });
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
      alert('Mikrofon erişimi reddedildi.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const isMatch = result && result.score >= 80;

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-[#EBE5D9] p-6 md:p-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-[#C8102E]/5 rounded-2xl text-[#C8102E]">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-[#2D2A26]">Telaffuz Kontrolü</h2>
            <p className="text-[#6B655B] text-sm mt-1">Sesinizi kaydedin ve yapay zeka ile telaffuzunuzu test edin.</p>
          </div>
        </div>
        <button 
          onClick={pickRandomWord}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FDFBF7] hover:bg-[#F2EFE9] border border-[#EBE5D9] text-[#2D2A26] rounded-xl transition-all text-sm font-medium shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Başka Kelime</span>
        </button>
      </div>

      <div className="mb-10 p-8 bg-[#FDFBF7] rounded-[2rem] border border-[#EBE5D9] text-center relative shadow-inner">
        <div className="absolute top-6 right-6 flex space-x-2">
          <button
            onClick={() => playTargetAudio(false)}
            disabled={audioLoadingState !== null}
            className="p-3.5 rounded-full bg-white text-[#2D2A26] hover:bg-[#F2EFE9] transition-colors disabled:opacity-50 border border-[#EBE5D9] shadow-sm"
            aria-label="Normal Dinle"
            title="Normal Dinle"
          >
            {audioLoadingState === 'normal' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            onClick={() => playTargetAudio(true)}
            disabled={audioLoadingState !== null}
            className="p-3.5 rounded-full bg-white text-[#6B655B] hover:bg-[#F2EFE9] transition-colors disabled:opacity-50 border border-[#EBE5D9] shadow-sm"
            aria-label="Yavaş Dinle"
            title="Yavaş Dinle"
          >
            {audioLoadingState === 'slow' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Snail className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-[#A39E93] mb-4 uppercase tracking-widest font-bold">Hedef Kelime</p>
        <div className="text-7xl md:text-8xl font-medium text-[#2D2A26] mb-6 chinese-text leading-tight">{targetWord.hanzi}</div>
        <div className="text-2xl text-[#C8102E] font-medium mb-3 tracking-wide">{targetWord.pinyin}</div>
        <div className="text-lg text-[#6B655B]">{targetWord.turkish}</div>
      </div>

      <div className="flex flex-col items-center justify-center space-y-8 my-12">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          className={`relative flex items-center justify-center w-28 h-28 rounded-full transition-all duration-300 ${
            isRecording 
              ? 'bg-[#C8102E] text-white shadow-[0_0_0_12px_rgba(200,16,46,0.15)] animate-pulse' 
              : 'bg-[#FDFBF7] text-[#C8102E] hover:bg-[#F2EFE9] border-2 border-[#EBE5D9] shadow-sm'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <Loader2 className="w-10 h-10 animate-spin text-[#C8102E]" />
          ) : isRecording ? (
            <Square className="w-10 h-10 fill-current" />
          ) : (
            <Mic className="w-12 h-12" />
          )}
        </button>
        <p className="text-sm font-medium text-[#6B655B]">
          {isRecording ? 'Kaydediliyor... Durdurmak için tıklayın.' : 'Kayda başlamak için mikrofona tıklayın.'}
        </p>
      </div>

      {result && !loading && (
        <div className={`mt-10 p-8 rounded-[2rem] border ${isMatch ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#FFFBEB] border-[#FDE68A]'}`}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className={`flex items-center justify-center w-24 h-24 rounded-full shrink-0 bg-white shadow-sm border ${isMatch ? 'border-[#BBF7D0]' : 'border-[#FDE68A]'}`}>
              <span className={`text-4xl font-bold ${isMatch ? 'text-[#166534]' : 'text-[#92400E]'}`}>
                {result.score}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                {isMatch ? (
                  <CheckCircle2 className="w-7 h-7 text-[#22C55E] shrink-0" />
                ) : (
                  <XCircle className="w-7 h-7 text-[#F59E0B] shrink-0" />
                )}
                <h3 className={`text-xl font-semibold ${isMatch ? 'text-[#166534]' : 'text-[#92400E]'}`}>
                  {isMatch ? 'Harika Telaffuz!' : 'Biraz Daha Pratik Yapmalısın'}
                </h3>
              </div>
              <p className={`text-lg mb-5 leading-relaxed ${isMatch ? 'text-[#15803D]' : 'text-[#B45309]'}`}>
                {result.feedback}
              </p>
              <div className="bg-white/60 rounded-xl p-4 text-sm border border-white/40">
                <span className="text-[#6B655B]">Senin söylediğin:</span>
                <span className="font-medium text-[#2D2A26] ml-2 text-lg chinese-text">{result.transcription}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
