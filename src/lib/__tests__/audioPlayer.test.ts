import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pickAudioUri, resolveAudioSource } from '../audioPlayer';
import type { VocabularyWord } from '../../data/vocabulary';

const rowWithAudio: VocabularyWord = {
  hanzi: '你好', pinyin: 'nǐ hǎo', turkish: 'Merhaba', english: 'Hello', category: 'greetings',
  audio: {
    hanzi:   { normal: 'https://hf/n.wav',    slow: 'https://hf/s.wav' },
    english: { normal: 'https://hf/en-n.wav', slow: 'https://hf/en-s.wav' },
    turkish: { normal: 'https://hf/tr-n.wav', slow: 'https://hf/tr-s.wav' },
  },
};

const rowWithout: VocabularyWord = {
  hanzi: '谢谢', pinyin: 'xiè xie', turkish: 'Teşekkürler', category: 'greetings',
};

describe('pickAudioUri', () => {
  it('returns URI when present', () => {
    expect(pickAudioUri(rowWithAudio, 'hanzi', 'normal')).toBe('https://hf/n.wav');
    expect(pickAudioUri(rowWithAudio, 'hanzi', 'slow')).toBe('https://hf/s.wav');
    expect(pickAudioUri(rowWithAudio, 'english', 'normal')).toBe('https://hf/en-n.wav');
  });

  it('returns null when field missing', () => {
    expect(pickAudioUri(rowWithAudio, 'example_zh', 'normal')).toBeNull();
    expect(pickAudioUri(rowWithout, 'hanzi', 'normal')).toBeNull();
  });
});

describe('resolveAudioSource', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  const audioProbe = { ok: true, headers: new Headers({ 'content-type': 'audio/wav' }) };
  const htmlProbe  = { ok: true, headers: new Headers({ 'content-type': 'text/html' }) };
  const notFound   = { ok: false, status: 404, headers: new Headers() };

  it('returns the URI when the HEAD probe succeeds with audio content-type', async () => {
    (global.fetch as any).mockResolvedValue(audioProbe);
    const src = await resolveAudioSource(rowWithAudio, 'hanzi', 'normal', 'zh');
    expect(src).toEqual({ kind: 'uri', src: 'https://hf/n.wav' });
    expect(global.fetch).toHaveBeenCalledWith('https://hf/n.wav', { method: 'HEAD' });
  });

  it('falls back to Gemini when the URI probe 404s (zh)', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(notFound)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ audio: 'AAA' }) });
    const src = await resolveAudioSource(rowWithAudio, 'hanzi', 'normal', 'zh');
    expect(src?.kind).toBe('buffer');
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/tts', expect.objectContaining({ method: 'POST' }));
  });

  it('falls back to Gemini when the probe returns 200 + HTML (SPA catch-all)', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(htmlProbe)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ audio: 'AAA' }) });
    const src = await resolveAudioSource(rowWithAudio, 'hanzi', 'normal', 'zh');
    expect(src?.kind).toBe('buffer');
  });

  it('falls back to Gemini when URI missing but target is zh', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ audio: 'AAA' }) });
    const src = await resolveAudioSource(rowWithout, 'hanzi', 'normal', 'zh');
    expect(src?.kind).toBe('buffer');
    expect(global.fetch).toHaveBeenCalledWith('/api/tts', expect.objectContaining({ method: 'POST' }));
  });

  it('returns null when URI 404s and target has no Gemini fallback (tr)', async () => {
    (global.fetch as any).mockResolvedValue(notFound);
    const src = await resolveAudioSource(rowWithAudio, 'turkish', 'normal', 'tr');
    expect(src).toBeNull();
  });

  it('returns null when URI missing and target has no Gemini fallback (tr)', async () => {
    const src = await resolveAudioSource(rowWithout, 'hanzi', 'normal', 'tr');
    expect(src).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
