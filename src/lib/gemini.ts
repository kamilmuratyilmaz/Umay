import { getCachedAudioUrl, saveAudioToServer } from "./audioCache";
import type { LangCode } from "../i18n";

// 1. Generate Speech (TTS) — proxied through server to keep API key off the client
export const generateSpeech = async (
  text: string,
  voiceName: string = "Puck",
  category: string = "general",
  isSlow: boolean = false
): Promise<ArrayBuffer> => {
  const cachedUrl = await getCachedAudioUrl(text, voiceName, category, isSlow);

  if (cachedUrl) {
    try {
      const res = await fetch(cachedUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 0) return buffer;
      }
    } catch (e) {
      console.warn(`Failed to fetch cached audio for ${text}, falling back to API`, e);
    }
  }

  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceName, isSlow }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "TTS request failed");
  }

  const { audio } = await response.json();
  if (!audio) throw new Error("No audio in response");

  // Save to server cache in background
  saveAudioToServer(text, voiceName, audio, category, isSlow).catch(console.error);

  const binaryString = window.atob(audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// 2. Transcribe Audio
export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Audio, mimeType }),
  });
  if (!response.ok) throw new Error("Transcription failed");
  const { text } = await response.json();
  return text;
};

// 3. Evaluate Pronunciation
export const evaluatePronunciation = async (
  base64Audio: string,
  mimeType: string,
  targetWord: string,
  pinyin: string
) => {
  const response = await fetch("/api/evaluate-pronunciation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Audio, mimeType, targetWord, pinyin }),
  });
  if (!response.ok) throw new Error("Pronunciation evaluation failed");
  return response.json();
};

// 4. Explain Grammar
export const explainGrammar = async (
  query: string,
  native: LangCode = "tr",
  target: LangCode = "zh",
) => {
  const response = await fetch("/api/grammar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, native, target }),
  });
  if (!response.ok) throw new Error("Grammar explanation failed");
  const { text } = await response.json();
  return text;
};
