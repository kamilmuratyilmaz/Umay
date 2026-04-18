import type { LangCode } from "../i18n";

// DEPRECATED — replaced by audioPlayer.resolveAudioSource. Removed in Phase 6.
export const generateSpeech = async (..._args: unknown[]): Promise<ArrayBuffer> => {
  throw new Error('generateSpeech has been replaced by audioPlayer.resolveAudioSource');
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
  pinyin: string,
  native: LangCode = "tr",
  target: LangCode = "zh",
) => {
  const response = await fetch("/api/evaluate-pronunciation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Audio, mimeType, targetWord, pinyin, native, target }),
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
