# Umay

> **Umay** — in Turkic mythology, the mother-goddess who protects women, children, and newborns; a giver of names, life, and language. Fitting for an app whose job is to help people be born into a new tongue.

A multilingual language learning app powered by **Google Gemini** and **Qwen 3 TTS**.

Umay is a tool that currently teaches **English, Turkish, and Mandarin Chinese** using polyglot-style techniques. More languages will be added over time. Every AI feature is parameterised by a `(native, target)` language pair — `tr`, `en`, `zh` are supported today, with `(tr, zh)` as the default fallback.

## Features

- **Flashcards** with pre-rendered native-speaker audio and on-demand Gemini TTS fallback
- **Grammar helper** — explains target-language grammar in the learner's native language
- **Pronunciation checker** — records, transcribes, and scores the learner's speech
- **Live tutor** — real-time voice dialog via Gemini's native audio WebSocket (with barge-in)
- **Language picker** — swap `(native, target)` pairs at runtime; UI strings and prompts follow

## Quick Start

**Prerequisites:** Node.js 20+, Python 3.13+, [`uv`](https://github.com/astral-sh/uv), a [Gemini API key](https://aistudio.google.com/apikey).

```bash
# 1. Install JS deps
npm install

# 2. Install Python deps (FastAPI backend)
cd ai_backend && uv sync && cd ..

# 3. Set your API key
echo "GEMINI_API_KEY=your_key_here" > .env.local

# 4. (Optional) Pre-download audio from the HuggingFace bucket
npm run download-audio

# 5. Run frontend (:3000) + AI backend (:8000) concurrently
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Frontend + AI backend in parallel |
| `npm run dev:frontend` | Express + Vite middleware only (`:3000`) |
| `npm run dev:ai` | FastAPI + uvicorn reload only (`:8000`) |
| `npm run build` | Production Vite bundle |
| `npm run start` | Serve the built bundle with Express |
| `npm run lint` | `tsc --noEmit` (the only lint step) |
| `npm test` | Vitest one-shot |
| `npm run test:watch` | Vitest watch mode |
| `npm run sync-vocab` | Regenerate `src/data/vocabulary.ts` from the upstream dataset |
| `npm run download-audio` | Idempotently pull WAVs from the HF bucket |

## Architecture

```
React SPA (Vite) ──► Express (:3000) ──► FastAPI (:8000) ──► Gemini API
                         │                    └─ google-genai (live) / litellm (REST)
                         └─ static /audio  (pre-downloaded WAVs from HF bucket)
```

- **Express (`server.ts`)** — serves the SPA, rate-limits `/api` at 30 req/min, serves pre-downloaded audio at `/audio`, and proxies a whitelist of paths (`/api/tts`, `/api/grammar`, `/api/transcribe`, `/api/evaluate-pronunciation`, plus the `/api/live` WebSocket upgrade) to FastAPI.
- **FastAPI (`ai_backend/main.py`)** — one router per feature under `/api` (`tts`, `grammar`, `pronunciation`, `transcribe`, `live`). Prompts live in `ai_backend/prompts.py` and are dispatched per `(native, target)` pair.
- **No database.** Vocabulary is a generated static module (`src/data/vocabulary.ts`); audio is files on disk.

### Model split

| Purpose | Model | Library |
|---|---|---|
| TTS | `gemini-2.5-flash-preview-tts` | `litellm` (PCM16 @ 24 kHz) |
| Grammar / transcribe / pronunciation | `gemini-2.5-flash` | `litellm` |
| Live voice dialog | `gemini-2.5-flash-native-audio-dialog` | `google-genai` (WebSocket) |

`live.py` has an explicit vLLM swap point — the Gemini live session is intended to be replaceable by a local real-time model behind the same contract.

### Audio pipeline

1. Vocabulary rows point at URIs like `/audio/{field}/{speed}/row_{N}.wav`.
2. `npm run download-audio` pulls WAVs from the `Thoria/TTS-UMAY` HF bucket — pre-rendered with **Qwen 3 TTS** for native-speaker quality — using deterministic URLs (the dataset's JSON audio columns are not authoritative). Idempotent.
3. Client first **HEAD-probes** the static URL. 200 → stream the file; 404 → call `/api/tts`, which returns base64 PCM16, and the client wraps it as WAV in-browser.
4. Turkish as a target (`tr`) is v2-gated and returns `null` rather than falling back to TTS.

## Environment

| Variable | Used by | Notes |
|---|---|---|
| `GEMINI_API_KEY` | both | **Required.** Baked into the frontend bundle at build time via `vite.config.ts` — see note on client-side exposure below. |
| `AI_BACKEND_URL` | Express | Defaults to `http://localhost:8000`. Set to `http://ai:8000` in Docker. |
| `AI_BACKEND_PORT` | FastAPI | Defaults to `8000`. |
| `PORT` | Express | Defaults to `3000`. |

> **Prototype note.** Client-side Gemini API key exposure is intentional for the current prototype. If you lock this down, update the `define` block in `vite.config.ts` and route all frontend callers through `/api/*`.

## Docker

```bash
docker compose up --build
```

Two services share a named volume (`audio_files`) so the pre-downloaded audio is reachable by both:

- **`ai`** — Python 3.13 + uv, `:8000`, `/health` healthcheck
- **`frontend`** — 3-stage Node build, depends on `ai` being healthy, receives `GEMINI_API_KEY` as a build-arg

## Tech Stack

- **Frontend:** React 19, Vite 6, Tailwind v4, TypeScript, Vitest (+ jsdom)
- **Backend:** FastAPI, `litellm`, `google-genai`, uv, Python 3.13
- **AI:** Google Gemini 2.5 (flash, flash-preview-tts, flash-native-audio-dialog); Qwen 3 TTS (offline bucket renders)
- **Infra:** Express reverse proxy, Docker Compose, HuggingFace Hub audio bucket

## Project Layout

```
.
├── ai_backend/          FastAPI app, Gemini wrappers, prompts
├── data/audio/          Pre-downloaded WAVs (gitignored)
├── scripts/             sync-vocab, download-audio
├── src/
│   ├── components/      React UI (Flashcards, LiveTutor, GrammarHelper, …)
│   ├── data/            Generated vocabulary module
│   ├── hooks/           useLiveAPI (16 kHz mic → 24 kHz playback queue), etc.
│   ├── i18n/            Per-pair UI strings
│   └── lib/             audioPlayer (HEAD-probe → TTS fallback), pcm16ToWav
└── server.ts            Express entry (SPA + /api proxy + /audio static)
```

## Contributing

Contributions welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) — in short: open an issue for anything non-trivial, use Conventional Commits, and sign every commit with DCO (`git commit -s`). We don't require a CLA.

## License

[AGPL-3.0-only](./LICENSE). If you run a modified Umay as a network service, you must make your modifications available to your users. That's the whole point.
