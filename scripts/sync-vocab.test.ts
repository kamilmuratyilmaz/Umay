import { describe, it, expect } from 'vitest';
import { rowsToVocabularyTs } from './sync-vocab';
import fixture from './__fixtures__/rows.json' with { type: 'json' };

describe('rowsToVocabularyTs', () => {
  it('emits a valid TS module with the expected rows', () => {
    const out = rowsToVocabularyTs(fixture.rows.map(r => r.row));
    expect(out).toMatch(/export const VOCABULARY: VocabularyWord\[\] = \[/);
    expect(out).toContain('"hanzi": "你好"');
    expect(out).toContain('"hanzi": "谢谢"');
  });

  it('nests audio columns under an audio sub-object', () => {
    const out = rowsToVocabularyTs(fixture.rows.map(r => r.row));
    expect(out).toMatch(/"audio":\s*\{[\s\S]*?"hanzi":\s*\{\s*"normal":\s*"https:\/\/hf\.co\/bucket\/hanzi\/normal\/row_0\.wav"/);
    expect(out).toMatch(/"english":\s*\{\s*"normal":\s*"https:\/\/hf\.co\/bucket\/en\/normal\/row_0\.wav"/);
  });

  it('omits audio entirely when no URIs are present', () => {
    const out = rowsToVocabularyTs(fixture.rows.map(r => r.row));
    const row1Segment = out.split('"hanzi": "谢谢"')[1]?.split('}')[0] ?? '';
    expect(row1Segment).not.toContain('"audio":');
  });

  it('drops missing optional text fields', () => {
    const out = rowsToVocabularyTs(fixture.rows.map(r => r.row));
    const row1 = out.split('"hanzi": "谢谢"')[1] ?? '';
    expect(row1).not.toContain('"example_zh"');
    expect(row1).not.toContain('"example_tr"');
    expect(row1).not.toContain('"example_en"');
  });
});
