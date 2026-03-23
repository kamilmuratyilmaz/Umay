import { useState, useRef, useCallback } from "react";

export const useLiveAPI = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const playNextAudio = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift()!;
    const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    audioBuffer.getChannelData(0).set(audioData);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    const currentTime = audioContextRef.current.currentTime;
    const startTime = Math.max(currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;
    source.onended = () => playNextAudio();
  }, []);

  const base64ToFloat32Array = (base64: string) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) float32Array[i] = int16Array[i] / 32768.0;
    return float32Array;
  };

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    processorNodeRef.current?.disconnect();
    processorNodeRef.current = null;
    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorNodeRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      sourceNodeRef.current.connect(processorNodeRef.current);
      processorNodeRef.current.connect(audioContextRef.current.destination);

      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${window.location.host}/api/live`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "config",
            model: "gemini-2.5-flash-native-audio-preview-12-2025",
            voiceName: "Puck",
            systemInstruction:
              "You are a friendly Chinese teacher for a Turkish speaker. You speak both Turkish and Mandarin Chinese. Help the user practice their conversational Chinese. Correct their mistakes gently. Keep responses concise.",
          })
        );
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === "connected") {
          setIsConnected(true);
          setIsConnecting(false);

          processorNodeRef.current!.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
            }
            const uint8 = new Uint8Array(pcm16.buffer);
            let binary = "";
            for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i]);
            ws.send(
              JSON.stringify({
                type: "audio",
                data: window.btoa(binary),
                mimeType: "audio/pcm;rate=16000",
              })
            );
          };
        } else if (msg.type === "message") {
          const geminiMsg = msg.data;
          if (geminiMsg.serverContent?.modelTurn?.parts) {
            for (const part of geminiMsg.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                const audioData = base64ToFloat32Array(part.inlineData.data);
                audioQueueRef.current.push(audioData);
                if (!isPlayingRef.current) playNextAudio();
              }
            }
          }
          if (geminiMsg.serverContent?.interrupted) {
            audioQueueRef.current = [];
            nextPlayTimeRef.current = 0;
            isPlayingRef.current = false;
          }
        } else if (msg.type === "error") {
          setError(msg.message || "Connection error");
          disconnect();
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection error");
        disconnect();
      };

      ws.onclose = () => disconnect();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect");
      setIsConnecting(false);
      disconnect();
    }
  }, [playNextAudio, disconnect]);

  return { connect, disconnect, isConnected, isConnecting, error };
};
