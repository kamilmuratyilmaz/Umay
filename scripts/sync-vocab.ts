#!/usr/bin/env tsx
// Generates src/data/vocabulary.ts from the HuggingFace dataset
// Thoria/mandarin-most-common-words-tr-en. Run manually via `npm run sync-vocab`.

import fs from 'node:fs';
import path from 'node:path';

const DATASET = 'Thoria/mandarin-most-common-words-tr-en';
const CONFIG  = 'default';
const SPLIT   = 'train';
const PAGE    = 100;
const API     = 'https://datasets-server.huggingface.co/rows';

type HFRow = Record<string, unknown>;

type AudioPair = { normal: string; slow: string };
type AudioNest = {
  hanzi?: AudioPair;
  english?: AudioPair;
  turkish?: AudioPair;
  example_zh?: AudioPair;
  example_en?: AudioPair;
  example_tr?: AudioPair;
};

// Nested JSON shape inside zh_audio / en_audio / tr_audio columns.
type HFAudioBlob = {
  sentence?: { normal?: string; slow?: string };
  word?:     { normal?: string; slow?: string };
};

// Maps one of the three per-language audio columns onto the two VocabularyWord
// fields it feeds (word → hanzi/english/turkish, sentence → example_*).
const AUDIO_COLS: Array<{
  column: 'zh_audio' | 'en_audio' | 'tr_audio';
  wordKey: keyof AudioNest;
  sentenceKey: keyof AudioNest;
}> = [
  { column: 'zh_audio', wordKey: 'hanzi',   sentenceKey: 'example_zh' },
  { column: 'en_audio', wordKey: 'english', sentenceKey: 'example_en' },
  { column: 'tr_audio', wordKey: 'turkish', sentenceKey: 'example_tr' },
];

// Converts an HF bucket URL into the local path served by Express.
// Accepts `/tree/` (dataset-browser URL, not downloadable), `/resolve/`
// (current HF Buckets direct-download URL), and `/resolve/main/` (standard
// HF datasets direct-download URL). All three produce the same local path.
// Returns null for anything that doesn't match, so malformed entries in the
// dataset don't silently produce broken <audio src> values.
//
//   https://huggingface.co/buckets/Thoria/TTS-UMAY/tree/example_zh/normal/row_0.wav
//   https://huggingface.co/buckets/Thoria/TTS-UMAY/resolve/example_zh/normal/row_0.wav
//   https://huggingface.co/buckets/Thoria/TTS-UMAY/resolve/main/example_zh/normal/row_0.wav
//     → /audio/example_zh/normal/row_0.wav
export function toLocalPath(hfUrl: string): string | null {
  if (!hfUrl) return null;
  const match = hfUrl.match(/\/(?:tree|resolve(?:\/main)?)\/(.+\.wav)$/);
  return match ? `/audio/${match[1]}` : null;
}

// ─────────────────────────────────────────────────────────────────────────
// TODO(user): implement the body of buildAudio.
//
// Contract:
//   - Input:  one HFRow. The three audio columns (zh_audio, en_audio, tr_audio)
//             arrive as JSON *strings* (or null / undefined / ""). Each parsed
//             value matches HFAudioBlob { sentence: {normal, slow}, word: {normal, slow} }.
//   - Output: AudioNest populated with LOCAL paths (use `toLocalPath(url)` on each
//             URL), or `undefined` if no usable audio entries were produced.
//
// Decisions you'll be making inside this function:
//
//   1. Malformed JSON: hard-fail the whole sync, or skip the row's audio?
//      The dataset is auto-generated — a single broken row shouldn't kill the
//      rebuild, but completely silent failures hide real regressions. I'd
//      recommend try/catch + console.warn, but your call.
//
//   2. Empty-string URLs ("") vs. missing keys: the dataset uses "" as a
//      "not generated yet" marker. Treat both the same? Or distinguish them?
//
//   3. toLocalPath(url) returning null means the URL didn't match the expected
//      HF bucket pattern. When that happens for one speed (e.g. 'slow') but
//      the other (`normal`) works — do you keep a half-populated AudioPair
//      (which the app doesn't support — the type requires both), or drop the
//      whole pair?
//
// Reference for structure: AUDIO_COLS above tells you which row field maps to
// which AudioNest key. Roughly:
//
//   for each { column, wordKey, sentenceKey } in AUDIO_COLS:
//     parse row[column] as HFAudioBlob
//     if blob.word.normal + blob.word.slow both map to non-null local paths:
//       nest[wordKey] = { normal, slow }
//     same for blob.sentence → nest[sentenceKey]
//
// Keep it short (~10 lines). Return undefined when nest is empty.
// ─────────────────────────────────────────────────────────────────────────
function buildAudio(row: HFRow): AudioNest | undefined {
  const nest: AudioNest = {};

  const toPair = (p?: { normal?: string; slow?: string }): AudioPair | null => {
    const normal = p?.normal ? toLocalPath(p.normal) : null;
    const slow   = p?.slow   ? toLocalPath(p.slow)   : null;
    return normal && slow ? { normal, slow } : null;
  };

  for (const { column, wordKey, sentenceKey } of AUDIO_COLS) {
    const raw = row[column];
    if (typeof raw !== 'string' || !raw) continue;
    let blob: HFAudioBlob;
    try { blob = JSON.parse(raw); }
    catch { console.warn(`sync-vocab: malformed JSON in ${column} — skipping`); continue; }
    const wordPair     = toPair(blob.word);
    const sentencePair = toPair(blob.sentence);
    if (wordPair)     nest[wordKey]     = wordPair;
    if (sentencePair) nest[sentenceKey] = sentencePair;
  }

  return Object.keys(nest).length ? nest : undefined;
}

function stripNullish<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') (out as any)[k] = v;
  }
  return out;
}

function rowToVocab(row: HFRow) {
  const base = stripNullish({
    hanzi:      row.hanzi,
    pinyin:     row.pinyin,
    turkish:    row.tr ?? row.turkish,
    english:    row.en ?? row.english,
    example_zh: row.example_zh,
    example_tr: row.example_tr,
    example_en: row.example_en,
    category:   row.category,
  });
  const audio = buildAudio(row);
  return audio ? { ...base, audio } : base;
}

export function rowsToVocabularyTs(rows: HFRow[]): string {
  const records = rows.map(rowToVocab);
  const body = JSON.stringify(records, null, 2);
  return `// AUTO-GENERATED by scripts/sync-vocab.ts — do not edit by hand.
// Source: HuggingFace dataset ${DATASET}.
// Regenerate: \`npm run sync-vocab\`.

export interface VocabularyAudio {
  normal: string;
  slow: string;
}

export interface VocabularyWord {
  hanzi: string;
  pinyin: string;
  turkish: string;
  english?: string;
  example_zh?: string;
  example_tr?: string;
  example_en?: string;
  category: string;
  audio?: {
    hanzi?:      VocabularyAudio;
    english?:    VocabularyAudio;
    turkish?:    VocabularyAudio;
    example_zh?: VocabularyAudio;
    example_en?: VocabularyAudio;
    example_tr?: VocabularyAudio;
  };
}

export const VOCABULARY: VocabularyWord[] = ${body};
`;
}

async function fetchAllRows(): Promise<HFRow[]> {
  const all: HFRow[] = [];
  let offset = 0;
  while (true) {
    const url = `${API}?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}&split=${SPLIT}&offset=${offset}&length=${PAGE}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HF API returned ${res.status}: ${await res.text()}`);
    const json = await res.json() as { rows: Array<{ row_idx: number; row: HFRow }>; num_rows_total: number };
    if (!json.rows?.length) break;
    for (const r of json.rows) all.push(r.row);
    offset += json.rows.length;
    if (offset >= (json.num_rows_total ?? 0)) break;
  }
  return all;
}

async function main() {
  console.log(`Fetching rows from ${DATASET}...`);
  const rows = await fetchAllRows();
  console.log(`Received ${rows.length} rows.`);
  const out = rowsToVocabularyTs(rows);
  const target = path.join(process.cwd(), 'src', 'data', 'vocabulary.ts');
  fs.writeFileSync(target, out);
  console.log(`Wrote ${target} (${out.length} bytes).`);
}

const invokedDirectly = typeof process !== 'undefined' && process.argv[1]?.endsWith('sync-vocab.ts');
if (invokedDirectly) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
