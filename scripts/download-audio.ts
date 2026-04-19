#!/usr/bin/env tsx
// Downloads every WAV from the Thoria/TTS-UMAY bucket into data/audio/.
// Run manually via `npm run download-audio`, or bake into a Dockerfile RUN step
// so the container ships with audio pre-fetched.
//
// URLs are constructed deterministically (folder × speed × row_i), not pulled
// from the dataset's JSON columns. Those columns contain NULLs for rows where
// the actual WAVs do exist on the bucket — reading them as authoritative
// undercounts by ~half. Mirror of download_audio_anki.py's approach.
//
// Output layout: data/audio/{folder}/{speed}/row_{N}.wav — matches the local
// paths sync-vocab.ts emits into vocabulary.ts, so the app can serve them
// directly from Express.
//
// Outcomes are classified so upstream-incomplete folders (tr, example_tr)
// don't look like a broken run:
//   downloaded — new file written to disk
//   skipped    — file already present (idempotent reruns cost ~nothing)
//   missing    — upstream 404, file genuinely isn't there yet
//   failed     — transient error (timeout/5xx/network) that survived all retries

import fs from 'node:fs/promises';
import path from 'node:path';

const BUCKET         = 'https://huggingface.co/buckets/Thoria/TTS-UMAY/resolve';
const FOLDERS        = ['hanzi', 'example_zh', 'en', 'example_en', 'tr', 'example_tr'] as const;
const SPEEDS         = ['normal', 'slow'] as const;
const N_ROWS         = 1143;
const OUT_DIR        = path.join(process.cwd(), 'data', 'audio');
// Matches download_audio_anki.py — higher concurrency triggers soft 404s from
// HF's CDN that only recover on retry. 16 + an explicit UA cleans it up.
const CONCURRENCY    = 16;
const USER_AGENT     = 'tts-umay-fetcher/1.0 (+https://huggingface.co/datasets/Thoria/mandarin-most-common-words-tr-en)';
const MAX_ATTEMPTS   = 3;
const RETRY_BASE_MS  = 500;
const REQ_TIMEOUT_MS = 20_000;

type Folder = typeof FOLDERS[number];
type Speed  = typeof SPEEDS[number];
type Job    = { folder: Folder; speed: Speed; row: number };

type Outcome = 'downloaded' | 'skipped' | 'missing' | 'failed';
const OUTCOMES: Outcome[] = ['downloaded', 'skipped', 'missing', 'failed'];

function jobUrl(j: Job):     string { return `${BUCKET}/${j.folder}/${j.speed}/row_${j.row}.wav`; }
function jobRelPath(j: Job): string { return path.join(j.folder, j.speed, `row_${j.row}.wav`); }

function allJobs(): Job[] {
  const jobs: Job[] = [];
  for (const folder of FOLDERS)
    for (const speed of SPEEDS)
      for (let row = 0; row < N_ROWS; row++)
        jobs.push({ folder, speed, row });
  return jobs;
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function downloadOne(job: Job): Promise<Outcome> {
  const url  = jobUrl(job);
  const dest = path.join(OUT_DIR, jobRelPath(job));
  try { await fs.access(dest); return 'skipped'; } catch { /* not cached */ }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
        headers: { 'User-Agent': USER_AGENT },
      });
      if (res.status === 404) return 'missing';                       // permanent, don't retry
      if (res.status >= 400 && res.status < 500) return 'missing';    // 401/403 also permanent — bucket not public yet
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get('content-type') ?? '';
      if (ct.startsWith('text/html')) throw new Error('HTML response (not audio)');
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) throw new Error('empty body');

      await fs.mkdir(path.dirname(dest), { recursive: true });
      const tmp = `${dest}.tmp`;
      await fs.writeFile(tmp, buf);
      await fs.rename(tmp, dest);                                     // atomic: no partial files on ctrl-c
      return 'downloaded';
    } catch (err: unknown) {
      if (attempt === MAX_ATTEMPTS) {
        console.warn(`  ✗ ${url} → ${(err as Error).message}`);
        return 'failed';
      }
      await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));                // 500ms, 1s, (stop)
    }
  }
  return 'failed';
}

async function runLimited<T>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`;
}

function pad(n: number, w: number) { return String(n).padStart(w); }

async function main() {
  const jobs = allJobs();
  console.log(`Target  : ${OUT_DIR}`);
  console.log(`Jobs    : ${jobs.length} files  (${FOLDERS.length} folders × ${SPEEDS.length} speeds × ${N_ROWS} rows)`);
  console.log(`Config  : concurrency=${CONCURRENCY}, retries=${MAX_ATTEMPTS}, timeout=${REQ_TIMEOUT_MS / 1000}s`);
  console.log();

  const counts: Record<Outcome, number> = { downloaded: 0, skipped: 0, missing: 0, failed: 0 };
  const byField: Record<string, Record<Outcome, number>> = {};
  const started = Date.now();
  let done = 0;

  await runLimited(jobs, CONCURRENCY, async (job) => {
    const outcome = await downloadOne(job);
    counts[outcome]++;
    (byField[job.folder] ??= { downloaded: 0, skipped: 0, missing: 0, failed: 0 })[outcome]++;
    done++;
    if (done % 200 === 0 || done === jobs.length) {
      const elapsed = Date.now() - started;
      const rate = done / (elapsed / 1000);
      const eta = rate > 0 ? (jobs.length - done) / rate * 1000 : 0;
      console.log(
        `  ${pad(done, 5)}/${jobs.length}  ${rate.toFixed(0).padStart(3)}/s  ETA ${fmtDuration(eta).padStart(5)}  ` +
        `· dl=${pad(counts.downloaded, 5)} skip=${pad(counts.skipped, 5)} miss=${pad(counts.missing, 5)} fail=${pad(counts.failed, 4)}`,
      );
    }
  });

  console.log(`\nElapsed: ${fmtDuration(Date.now() - started)}`);
  console.log('\nPer-field breakdown:');
  const fields = Object.keys(byField).sort();
  const w = Math.max(...fields.map(f => f.length), 10);
  console.log(`  ${'field'.padEnd(w)}   dl   skip   miss   fail`);
  for (const f of fields) {
    const c = byField[f];
    console.log(`  ${f.padEnd(w)} ${pad(c.downloaded, 4)} ${pad(c.skipped, 6)} ${pad(c.missing, 6)} ${pad(c.failed, 6)}`);
  }

  const totals = OUTCOMES.map(o => `${o}=${counts[o]}`).join('  ');
  console.log(`\nTotal: ${totals}`);

  // Exit non-zero only for transient failures — upstream-missing files are expected
  // until the dataset is fully populated, and shouldn't fail CI or break Docker builds.
  if (counts.failed > 0) {
    console.log(`\n${counts.failed} transient failure(s) — rerun to retry.`);
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
