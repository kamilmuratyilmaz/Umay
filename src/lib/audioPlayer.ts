import type { VocabularyWord } from '../data/vocabulary';
import type { LangCode } from '../i18n';

export type AudioField = 'hanzi' | 'english' | 'turkish' | 'example_zh' | 'example_en' | 'example_tr';
export type AudioSpeed = 'normal' | 'slow';

export type AudioSource =
  | { kind: 'uri';    src: string }
  | { kind: 'buffer'; buffer: ArrayBuffer };

export function pickAudioUri(row: VocabularyWord, field: AudioField, speed: AudioSpeed): string | null {
  const entry = row.audio?.[field];
  if (!entry) return null;
  const src = entry[speed];
  return src || null;
}

// Turkish target is v2-gated: a missing URI there returns null (caller hides the button).
const GEMINI_FALLBACK_TARGETS: LangCode[] = ['zh', 'en'];

// Gemini TTS outputs 16-bit PCM at 24 kHz mono. Must match the backend's `format: "pcm16"` config.
const TTS_SAMPLE_RATE = 24000;

function textFor(row: VocabularyWord, field: AudioField): string | null {
  switch (field) {
    case 'hanzi':      return row.hanzi ?? null;
    case 'english':    return row.english ?? null;
    case 'turkish':    return row.turkish ?? null;
    case 'example_zh': return row.example_zh ?? null;
    case 'example_en': return row.example_en ?? null;
    case 'example_tr': return row.example_tr ?? null;
  }
}

// Wraps raw PCM16 mono samples in a minimal RIFF/WAVE container so the browser's
// <audio> element can decode them. Without this, Blob({type:'audio/wav'}) over raw
// PCM fails with NotSupportedError.
function pcm16ToWav(pcm: ArrayBuffer, sampleRate: number): ArrayBuffer {
  const byteRate = sampleRate * 2;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeAscii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, pcm.byteLength, true);

  const out = new Uint8Array(44 + pcm.byteLength);
  out.set(new Uint8Array(header), 0);
  out.set(new Uint8Array(pcm), 44);
  return out.buffer;
}

async function callGeminiTts(text: string, isSlow: boolean, target: LangCode): Promise<ArrayBuffer> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceName: 'Puck', isSlow, target }),
  });
  if (!res.ok) throw new Error(`TTS failed with status ${res.status}`);
  const { audio } = await res.json();
  if (!audio) throw new Error('No audio in TTS response');
  const bin = atob(audio);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return pcm16ToWav(bytes.buffer, TTS_SAMPLE_RATE);
}

// HEAD-probes the static /audio URL so we can fall through to Gemini TTS
// when the file hasn't been downloaded yet (dev machines without
// `npm run download-audio`, or the first boot of a Docker image that didn't
// bake them in). Any fetch error — 404, network, offline — is treated the
// same: pretend the URI wasn't there.
async function uriIsReachable(uri: string): Promise<boolean> {
  try {
    const res = await fetch(uri, { method: 'HEAD' });
    if (!res.ok) return false;
    // Defense in depth: an SPA catch-all middleware can return 200 + index.html
    // for missing audio. Require an audio content-type so we fall through to
    // Gemini TTS instead of handing HTML to the <audio> element.
    const ct = res.headers.get('content-type') ?? '';
    return ct.startsWith('audio/');
  } catch {
    return false;
  }
}

async function geminiFallback(
  row: VocabularyWord,
  field: AudioField,
  speed: AudioSpeed,
  target: LangCode,
): Promise<AudioSource | null> {
  if (!GEMINI_FALLBACK_TARGETS.includes(target)) return null;
  const text = textFor(row, field);
  if (!text) return null;
  const buffer = await callGeminiTts(text, speed === 'slow', target);
  return { kind: 'buffer', buffer };
}

export async function resolveAudioSource(
  row: VocabularyWord,
  field: AudioField,
  speed: AudioSpeed,
  target: LangCode,
): Promise<AudioSource | null> {
  const uri = pickAudioUri(row, field, speed);
  if (uri && await uriIsReachable(uri)) return { kind: 'uri', src: uri };
  return geminiFallback(row, field, speed, target);
}
