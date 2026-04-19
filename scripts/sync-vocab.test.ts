import { describe, it, expect } from 'vitest';
import { rowsToVocabularyTs, toLocalPath } from './sync-vocab';
import fixture from './__fixtures__/rows.json' with { type: 'json' };

const rows = () => fixture.rows.map(r => r.row);

describe('toLocalPath', () => {
  it('converts /tree/ URLs to local /audio paths', () => {
    expect(toLocalPath('https://huggingface.co/buckets/Thoria/TTS-UMAY/tree/example_zh/normal/row_0.wav'))
      .toBe('/audio/example_zh/normal/row_0.wav');
  });

  it('converts /resolve/ URLs (HF Buckets format) to local paths', () => {
    expect(toLocalPath('https://huggingface.co/buckets/Thoria/TTS-UMAY/resolve/example_zh/normal/row_0.wav'))
      .toBe('/audio/example_zh/normal/row_0.wav');
  });

  it('converts /resolve/main/ URLs (standard HF datasets format) to local paths', () => {
    expect(toLocalPath('https://huggingface.co/buckets/Thoria/TTS-UMAY/resolve/main/example_zh/normal/row_0.wav'))
      .toBe('/audio/example_zh/normal/row_0.wav');
  });

  it('returns null for unrecognized or empty URLs', () => {
    expect(toLocalPath('')).toBe(null);
    expect(toLocalPath('https://example.com/foo.wav')).toBe(null);
    expect(toLocalPath('https://huggingface.co/buckets/Thoria/TTS-UMAY/tree/example_zh/normal/row_0.mp3')).toBe(null);
  });
});

describe('rowsToVocabularyTs', () => {
  it('emits a valid TS module with the expected rows', () => {
    const out = rowsToVocabularyTs(rows());
    expect(out).toMatch(/export const VOCABULARY: VocabularyWord\[\] = \[/);
    expect(out).toContain('"hanzi": "你好"');
    expect(out).toContain('"hanzi": "谢谢"');
  });

  it('maps tr/en columns to turkish/english', () => {
    const out = rowsToVocabularyTs(rows());
    expect(out).toContain('"turkish": "Merhaba"');
    expect(out).toContain('"english": "Hello"');
  });

  it('nests audio under {field}.{speed} with local /audio paths', () => {
    const out = rowsToVocabularyTs(rows());
    expect(out).toContain('"normal": "/audio/hanzi/normal/row_0.wav"');
    expect(out).toContain('"normal": "/audio/example_zh/normal/row_0.wav"');
    expect(out).toContain('"normal": "/audio/english/normal/row_0.wav"');
    expect(out).toContain('"normal": "/audio/turkish/normal/row_0.wav"');
  });

  // Helper: pull the JSON array out of the generated TS and parse row 1 (谢谢).
  const parseRow1 = (): Record<string, unknown> => {
    const out = rowsToVocabularyTs(rows());
    const body = out.slice(out.indexOf('[\n'), out.lastIndexOf('];') + 1);
    return JSON.parse(body)[1];
  };

  it('omits audio entirely when all three audio columns are null', () => {
    expect(parseRow1()).not.toHaveProperty('audio');
  });

  it('drops missing optional text fields', () => {
    const row = parseRow1();
    expect(row).not.toHaveProperty('example_zh');
    expect(row).not.toHaveProperty('example_tr');
    expect(row).not.toHaveProperty('example_en');
  });

  it('handles malformed JSON in audio columns without crashing the sync', () => {
    // Row 2 (再见) has malformed en_audio and null tr_audio, but valid zh_audio
    // (with empty sentence URLs — also a partial-audio case). Whatever strategy
    // buildAudio picks, it should not throw and should preserve the row's text.
    expect(() => rowsToVocabularyTs(rows())).not.toThrow();
    const out = rowsToVocabularyTs(rows());
    expect(out).toContain('"hanzi": "再见"');
  });
});
