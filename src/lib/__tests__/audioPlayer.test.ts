import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pickAudioUri, resolveAudioSource } from '../audioPlayer';
import type { VocabularyWord } from '../../data/vocabulary';

const rowWithAudio: VocabularyWord = {
  hanzi: '你好', pinyin: 'nǐ hǎo', turkish: 'Merhaba', english: 'Hello', category: 'greetings',
  audio: {
    hanzi:   { normal: 'https://hf/n.wav', slow: 'https://hf/s.wav' },
    english: { normal: 'https://hf/en-n.wav', slow: 'https://hf/en-s.wav' },
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
    expect(pickAudioUri(rowWithAudio, 'turkish', 'normal')).toBeNull();
    expect(pickAudioUri(rowWithout, 'hanzi', 'normal')).toBeNull();
  });
});

describe('resolveAudioSource', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns the HF URI when the row has audio for the requested field/speed', async () => {
    const src = await resolveAudioSource(rowWithAudio, 'hanzi', 'normal', 'zh');
    expect(src).toEqual({ kind: 'uri', src: 'https://hf/n.wav' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('falls back to Gemini TTS when URI missing but target is zh', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ audio: 'AAA' }) });
    const src = await resolveAudioSource(rowWithout, 'hanzi', 'normal', 'zh');
    expect(src?.kind).toBe('buffer');
    expect(global.fetch).toHaveBeenCalledWith('/api/tts', expect.objectContaining({ method: 'POST' }));
  });

  it('returns null when URI missing and target lang has no Gemini fallback (tr)', async () => {
    const src = await resolveAudioSource(rowWithout, 'hanzi', 'normal', 'tr');
    expect(src).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
