# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Umay is a Mandarin Chinese learning app for Turkish speakers, powered by Google Gemini AI. UI and AI-generated feedback are in Turkish.

## Commands

```bash
# Development (starts both frontend:3000 and Python AI backend:8000)
npm run dev

# Frontend only (Express + Vite dev server on port 3000)
npm run dev:frontend

# AI backend only (FastAPI + uvicorn on port 8000)
npm run dev:ai

# Type checking (the only lint step configured)
npm run lint          # tsc --noEmit

# Production build
npm run build         # vite build

# Docker
docker compose up --build
```

### Python backend (ai_backend/)

Managed with `uv` (not pip). To add a dependency: `cd ai_backend && uv add <package>`. The virtual env lives at `ai_backend/.venv/`.

## Architecture

Two-process architecture with an Express proxy layer:

```
React SPA (Vite) → Express server (:3000) → FastAPI AI backend (:8000) → Google Gemini API
```

- **Express server (`server.ts`)** serves the SPA, proxies all `/api/*` HTTP routes and the `/api/live` WebSocket to the Python backend. Applies rate limiting (30 req/min) on `/api` paths. Serves cached TTS audio from `/data/audio/`.
- **FastAPI backend (`ai_backend/main.py`)** handles all AI calls: TTS, transcription, pronunciation evaluation, grammar explanation, and real-time voice conversation via WebSocket.
- **No shared database.** Vocabulary data is a static TypeScript module (`src/data/vocabulary.ts`). TTS audio is cached as MP3 files on disk at `/data/audio/{category}/`.

### Gemini models used

| Purpose | Model |
|---------|-------|
| Text/multimodal (transcription, pronunciation, grammar) | `gemini-2.5-flash` |
| Text-to-speech | `gemini-2.5-flash-preview-tts` |
| Real-time voice dialog (WebSocket) | `gemini-2.5-flash-native-audio-dialog` |

### Key data flow: Audio caching

TTS requests go through a cache-first strategy. Audio filenames are deterministic hashes of text content. On cache miss, audio is fetched from Gemini, returned to the client, and saved to disk via `/api/save-audio` in the background.

### Key data flow: Live Tutor WebSocket

Client opens `/api/live` → Express upgrades and proxies to FastAPI → FastAPI opens a session with Gemini's real-time audio API. Audio streams as base64-encoded PCM16 at 16kHz. Supports barge-in (interruption).

## Environment

- `GEMINI_API_KEY` in `.env.local` — required for both frontend (injected into bundle via `vite.config.ts` define) and backend
- `AI_BACKEND_URL` — defaults to `http://localhost:8000`, override in Docker (`http://ai:8000`)

## Frontend path alias

`@/*` maps to the project root (configured in both `tsconfig.json` and `vite.config.ts`).

## Docker

Two services in `docker-compose.yml`: `frontend` (3-stage Node build) and `ai` (Python 3.13 + uv). They share an `audio_files` volume mounted at `/app/data/audio`. Frontend depends on AI backend health check.
