# Umay — Design System & Multilingual Refresh

Date: 2026-04-18
Status: Draft — awaiting implementation-plan phase

## Goal

Apply the Umay Design System (under `/Users/mac074/Downloads/Umay Design System/`) to
the codebase, and expand the product from *Turkish speakers learning Chinese* to
**any of {Turkish, English, Chinese} learning any other**. Ship incrementally — some
native/target combinations are gated until audio data lands on HuggingFace.

## Scope at a glance

1. Token-based visual overhaul (cream/vermillion palette, new logo mark, generous
   radii, warm shadows, `Noto Serif SC` for every Hanzi).
2. 2-step **LanguagePicker** onboarding (3 languages only: tr/en/zh), persisted to
   `localStorage`. Header gains a language-pair pill that reopens the picker.
3. Vocabulary data moves to the HuggingFace dataset
   [`Thoria/mandarin-most-common-words-tr-en`](https://huggingface.co/datasets/Thoria/mandarin-most-common-words-tr-en)
   as the single source of truth. Synced to `src/data/vocabulary.ts` at build time
   via `npm run sync-vocab`.
4. TTS playback reads **public URIs from an HF bucket** per row; the existing
   Gemini-TTS + local cache path becomes a fallback for rows without audio (e.g.
   all Turkish-target content, until those columns are populated).
5. AI backend (`ai_backend/*`) adapts prompts + models per `{native, target}` pair
   where target audio exists; other pairs remain disabled in the picker.

## Non-goals

- Turkish-as-target experiences (deferred until Turkish audio is uploaded).
- Full rewrite to match the UI kit's inline-style JSX. We port primitives to TSX
  and keep Tailwind v4 as the styling engine, with tokens from the design system
  flowing through `@theme` and CSS variables.
- Changes to the SRS algorithm, rate-limiting rules, Docker layout, or WebSocket
  proxying — these are left intact.

---

## Language matrix

Two axes: `native ∈ {tr, en, zh}` and `target ∈ {tr, en, zh} \ {native}`. Six combinations.
A combination is **enabled** when the target language has sufficient TTS audio in the
dataset for vocabulary cards and example-sentence playback.

| native → target | Ships in | Gating |
|-----------------|----------|--------|
| `tr → zh`       | v1       | Chinese audio columns exist |
| `en → zh`       | v1       | Chinese audio columns exist |
| `zh → en`       | v1       | English audio columns exist |
| `tr → en`       | v1       | English audio columns exist |
| `en → tr`       | v2       | waits on Turkish audio |
| `zh → tr`       | v2       | waits on Turkish audio |

The picker *renders* all 6 options but disables v2 pairs with a "Yakında / Coming soon
/ 即将推出" label. Grammar and LiveTutor also check the target language and adapt prompts;
Pronunciation requires target-language speech recognition and hides itself if unsupported.

---

## Data model

### HuggingFace dataset shape

The committed schema we target (Turkish audio columns added later):

```
hanzi, pinyin,
turkish, english,
example_zh, example_tr, example_en,
category,
audio_hanzi_normal,        audio_hanzi_slow,
audio_english_normal,      audio_english_slow,
audio_example_zh_normal,   audio_example_zh_slow,
audio_example_en_normal,   audio_example_en_slow,
audio_turkish_normal,      audio_turkish_slow,        -- v2
audio_example_tr_normal,   audio_example_tr_slow      -- v2
```

Each `audio_*` column holds a **public URL** to a `.wav` file on the HF bucket.
`null` means "no audio for this row/language/speed" — client falls back to Gemini TTS
for `target=zh` rows; Turkish TTS fallback is deliberately not wired in v1.

### `src/data/vocabulary.ts` (generated)

```ts
export interface VocabularyWord {
  hanzi: string;
  pinyin: string;
  turkish: string;
  english: string;
  example_zh: string;
  example_tr: string;
  example_en: string;
  category: string;
  audio: {
    hanzi?:      { normal: string; slow: string };
    english?:    { normal: string; slow: string };
    turkish?:    { normal: string; slow: string };  // v2
    example_zh?: { normal: string; slow: string };
    example_en?: { normal: string; slow: string };
    example_tr?: { normal: string; slow: string };  // v2
  };
}
export const VOCABULARY: VocabularyWord[] = [ /* ~1143 rows */ ];
```

Why a nested `audio` object: keeps row shape stable whether a language is "available now"
or "available later." Consumers check `row.audio.turkish` before rendering a TR audio
button; no schema migration needed when Turkish audio lands.

### Sync script: `scripts/sync-vocab.ts`

Run with `npm run sync-vocab`. Not auto-run in CI; user runs manually when HF updates.
Steps:

1. Fetch the dataset (HF datasets HTTP API — Parquet or JSON).
2. Validate required columns exist; warn on new columns the script doesn't know about.
3. Write `src/data/vocabulary.ts` from a template, sorted by row index to keep diffs stable.
4. Format with Prettier (match project style).

The generated file is committed to git. Size estimate: ~1143 rows × ~800 bytes/row ≈ 1MB;
acceptable for the bundle (Vite will tree-shake unused fields).

---

## Frontend architecture

### New directory layout

```
src/
  App.tsx                     # gains LanguagePicker gate + i18n provider
  index.css                   # ports colors_and_type.css tokens into @theme
  assets/
    logo-mark.svg             # from design system
    logo-lockup.svg
    logo-lockup-dark.svg
  components/
    ui/                       # NEW — primitives from ui_kits/web_app, TSX
      LogoMark.tsx
      Pill.tsx
      Card.tsx
      IconButton.tsx
      HeroIconTile.tsx
      SectionHeading.tsx
      Eyebrow.tsx
      Header.tsx
    LanguagePicker.tsx        # NEW — 2-step onboarding
    VocabularyList.tsx        # refactored: new tokens, language-aware
    Flashcards.tsx            # refactored
    GrammarHelper.tsx         # refactored
    PronunciationChecker.tsx  # refactored
    LiveTutor.tsx             # refactored
    ErrorBoundary.tsx         # unchanged
  context/
    LanguageContext.tsx       # NEW — native/target + setter
  i18n/
    index.ts                  # NEW — tiny i18n util (dict lookup, no deps)
    strings.ts                # NEW — UI copy in tr/en/zh
  lib/
    audioCache.ts             # simplified: primary playback is from row.audio URIs
    gemini.ts                 # gains target-language parameter
    audioPlayer.ts            # NEW — single place that decides URI-vs-Gemini
  hooks/
    useLiveAPI.ts             # gains {native, target} session config
  data/
    vocabulary.ts             # generated
```

### Tokens in `src/index.css`

Tailwind v4's `@theme` accepts CSS-variable overrides. We port the design system
`colors_and_type.css` into a single `@theme` block so tokens are available both as
CSS vars and as Tailwind utilities:

```css
@theme {
  --color-cream:        #FDFBF7;
  --color-paper:        #FFFFFF;
  --color-parchment:    #F2EFE9;
  --color-sand:         #EBE5D9;
  --color-ink:          #2D2A26;
  --color-ink-deep:     #1A1816;
  --color-stone:        #6B655B;
  --color-mist:         #A39E93;
  --color-vermillion:   #C8102E;
  --color-vermillion-deep: #A00D25;
  --color-saffron:      #E8A33D;
  --color-lapis:        #2E5CB8;
  --color-jade:         #047857;
  /* ... (radii, shadows, motion durations, etc. per colors_and_type.css) */

  --font-sans:  "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-cjk:   "Noto Serif SC", "Songti SC", ui-serif, serif;
  --font-serif: "Noto Serif", Georgia, "Times New Roman", serif;
}
```

Tailwind automatically generates `bg-cream`, `text-ink`, `border-sand`, etc. Usage
sites read like `bg-paper border border-sand rounded-3xl shadow-sm` instead of the
current hex-literal soup (`bg-[#FDFBF7]`, `border-[#EBE5D9]`).

### Primitives (`src/components/ui/`)

Direct TSX ports of the design system's `Primitives.jsx`. Each component accepts
Tailwind `className` for one-off overrides. No runtime style prop threading — the
current inline-style-in-JSX approach is replaced with Tailwind classes + CSS vars.

`Header.tsx` accepts `{ tab, setTab, native, target, onChangeLanguage }`. It replaces
the header block currently in `App.tsx`.

### LanguagePicker

Two-step flow per UI kit, trimmed to 3 languages:

1. **Step 1** — "Ana dilin hangisi? / What's your native language? / 你的母语是什么？"
   — cards for tr/en/zh.
2. **Step 2** — "Hangi dili öğrenmek istiyorsun? / Which language do you want to learn?
   / 你想学哪种语言？" — the other two languages. v2-gated combinations render disabled
   with a "Yakında / Coming soon / 即将推出" badge.

Persists `umay_native` + `umay_target` to `localStorage`. Re-openable via the
header language-pair pill.

### App.tsx gate

```tsx
const { native, target } = useLanguage();
if (!native || !target) return <LanguagePicker onDone={setLanguages} />;
return <AppShell>{renderTab()}</AppShell>;
```

### i18n

Hand-rolled dict lookup (no `react-i18next`). Three maps in `src/i18n/strings.ts`
keyed by `tr | en | zh`. `useLang()` returns `t(key)` and the active `native` code.
Strings harvested from:
- the current Turkish literals across `components/*.tsx`,
- English equivalents from the design system's `VOCAB_UI` and `COPY` objects,
- Chinese ones written fresh (~40 strings total).

---

## TTS playback

### New flow

```
Play button clicked
  ↓
audioPlayer.play(row, field, speed)
  ↓
Does row.audio[field][speed] exist?
  ├─ yes → <audio src={URI}> plays directly from HF bucket (CDN)
  └─ no  → fall back to Gemini TTS via /api/tts for any v1 target
           (zh and en are both supported; tr target is v2-gated so
            tr-missing-audio is not an in-scope fallback path)
           → on success, play; do NOT write to /data/audio/ cache
             (the cache existed for Gemini output; HF URIs need no cache)
```

### Server changes

- `/api/save-audio` route + `/audio/*` static serving: **removed**.
- `data/audio/` directory contents become unused. No code writes to or reads from it
  after this change. The Docker volume definition is left in place (harmless); a
  follow-up can remove it once we're confident nothing depends on the mount.
- `/api/tts` proxy: kept, but called only when Gemini TTS is the fallback path.
- Rate limit stays on `/api/*` and now mostly guards the fallback TTS.

### Client changes

- `src/lib/audioCache.ts` is deleted. Its caller contracts move to `audioPlayer.ts`.
- `gemini.ts` `generateSpeech()` keeps its API, but the client only hits it when
  `audio[field][speed]` is missing.
- New single state atom for `currentlyPlaying: { rowIndex, field, speed } | null`
  so play buttons across the app coordinate (stop previous when a new one starts).

---

## AI backend (`ai_backend/`)

Each router takes a `{native, target}` payload. A small `ai_backend/prompts.py`
exports per-pair system prompts. Keys are `(native, target)` tuples.

- `routers/pronunciation.py` — expects audio in the *target* language. Gemini
  `gemini-2.5-flash` handles zh/en fine; for future `target=tr`, verify the
  model's tone analysis is sufficient before enabling the v2 pair.
- `routers/grammar.py` — system prompt explains *target*-language grammar, answer
  written in *native* language.
- `routers/live.py` — real-time audio session, target-language conversation. The
  system instruction adapts. Voice config stays `en-US` / `cmn-CN` / similar per
  target.
- `routers/tts.py` — kept as fallback. Client no longer calls it when a row URI
  exists.
- `routers/transcribe.py` — unchanged; STT model handles the three languages.

All six pair prompts are sketched in a follow-up doc at implementation time;
spec only freezes the contract (all routers accept `{native, target}`).

---

## Build and rollout order

Split into independent PR-sized chunks so each can merge + ship on its own.

1. **Tokens + primitives** — new `src/components/ui/`, `index.css` with `@theme`,
   logo SVGs imported. No product behaviour changes. Validate with every current
   screen (visual diff only).
2. **HF vocab sync** — `scripts/sync-vocab.ts` + regenerated `src/data/vocabulary.ts`
   with new audio columns (Chinese + English filled; Turkish empty). No UI wiring
   yet; existing TTS path still runs.
3. **TTS refactor** — `src/lib/audioPlayer.ts`, delete `audioCache.ts` + `/api/save-audio`,
   update all play-button call sites to the new player. Still Turkish-target-less.
4. **i18n + LanguagePicker** — context, strings, picker screen, header language pill.
   After this, `native ∈ {tr, en, zh}` works in the UI; `target` still de facto zh.
5. **AI backend pair prompts** — add `prompts.py`, thread `{native, target}` through
   all routers + Live Tutor session init. Enable `target=en` end-to-end.
6. **Component refactor pass** — port each of the five feature components to the
   new primitives + tokens (`VocabularyList`, `Flashcards`, `GrammarHelper`,
   `PronunciationChecker`, `LiveTutor`). One commit per component.
7. **v2: Turkish audio** — when HF dataset gains `audio_turkish_*` + `audio_example_tr_*`,
   re-run sync, enable `target=tr` pairs in the picker. No code changes expected.

---

## Error handling

- **HF URI 404** — rare but possible if the dataset gets out of sync with the bucket.
  Client logs and falls through to Gemini TTS (for `target=zh`) or shows a quiet
  "Ses şu anda kullanılamıyor / Audio unavailable" toast.
- **LanguagePicker never completed** — `localStorage` is the only gate. If cleared,
  user sees the picker again. No server-side state.
- **Disabled pair bypassed via URL or stale localStorage** — on boot, if
  `{native, target}` points to a v2-gated pair, we auto-reset to the picker.
- **AI backend unreachable** — existing 502 response path is kept; per-feature
  error boundaries already exist.

---

## Testing

- Manual walk-through of all four v1 pairs (`tr→zh`, `en→zh`, `zh→en`, `tr→en`) on
  each of the five surfaces (vocab, flashcards, grammar, pronunciation, live).
- Sync script: unit test against a fixture Parquet with 3 rows to confirm the
  generated TS file matches a snapshot.
- `audioPlayer` fallback: mock `row.audio.hanzi` missing → verify it calls `/api/tts`.
- Type-check (`npm run lint`) must pass across the TSX port.
- No automated UI tests currently; this refresh does not add them (out of scope).

---

## Open questions (not blocking spec approval, flag at implementation time)

1. Font pack for Turkish: `Inter` covers it; confirm `Noto Serif SC` never needs
   to render Turkish diacritics (it doesn't in the current product — but if the
   `zh → tr` experience ever displays TR inside `.cjk` spans, we'd want a check).
2. HF dataset column naming — once you upload, if column names differ from the
   placeholders in §"Data model", the sync script's mapping needs one-line edits.
3. The `dump.rdb` Redis dump committed in `ai_backend/` — seems accidental. Add
   to `.gitignore` as part of this work? (Not blocking, but while we're here.)
