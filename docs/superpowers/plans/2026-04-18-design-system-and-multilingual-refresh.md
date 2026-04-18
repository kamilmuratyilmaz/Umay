# Umay Design System & Multilingual Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Umay Design System (tokens, logo, primitives) to the React+Vite
codebase, and expand the product from Turkish→Chinese to any pair of {tr, en, zh}
backed by the HuggingFace `Thoria/mandarin-most-common-words-tr-en` dataset.

**Architecture:** Tailwind v4 `@theme` holds the palette/radii/shadow tokens from
`colors_and_type.css`. Reusable TSX primitives replace inline-styled JSX across
the five feature surfaces. A `LanguagePicker` gates the app on first load, persisting
`native` + `target` to localStorage. Vocabulary is generated offline by a `sync-vocab`
script that pulls rows from HF (via the public datasets-server API) into
`src/data/vocabulary.ts`. TTS plays directly from the per-row `audio_*_*` URIs (public
HF bucket) with the existing Gemini TTS proxy as fallback.

**Tech Stack:** React 19, Vite 6, TypeScript 5.8, Tailwind v4 (`@theme`), lucide-react,
tsx runner, Vitest (added in this plan), FastAPI + litellm (`ai_backend/`), Gemini
2.5 Flash family (text / TTS / native-audio-dialog).

**Spec:** See `docs/superpowers/specs/2026-04-18-design-system-and-multilingual-refresh.md`.

---

## File Structure

### New files

```
scripts/
  sync-vocab.ts                       # HF dataset → src/data/vocabulary.ts generator
  __tests__/sync-vocab.test.ts        # unit tests against a tiny fixture
src/
  assets/
    logo-mark.svg                     # copied from design system
    logo-lockup.svg
    logo-lockup-dark.svg
  components/ui/                      # primitives (pure presentational)
    LogoMark.tsx
    Pill.tsx
    IconButton.tsx
    Card.tsx
    HeroIconTile.tsx
    SectionHeading.tsx
    Eyebrow.tsx
    Header.tsx
  components/LanguagePicker.tsx       # 2-step onboarding
  context/LanguageContext.tsx         # native/target state + setters
  i18n/strings.ts                     # UI copy in tr/en/zh
  i18n/index.ts                       # t() helper + useLang()
  i18n/__tests__/i18n.test.ts
  lib/audioPlayer.ts                  # URI-first, Gemini fallback
  lib/__tests__/audioPlayer.test.ts
ai_backend/
  prompts.py                          # per-(native,target) system prompts
vitest.config.ts                      # Vitest config
```

### Modified files

```
package.json                          # + scripts: sync-vocab, test; + deps: vitest, papaparse already in
src/index.css                         # port colors_and_type.css tokens into @theme
src/App.tsx                           # gate on LanguagePicker; use <Header/>
src/data/vocabulary.ts                # regenerated; schema gains `audio` field
src/lib/gemini.ts                     # + target-language param on generateSpeech + explainGrammar + evaluatePronunciation
src/hooks/useLiveAPI.ts               # accept {native, target, systemInstruction} from caller
src/components/VocabularyList.tsx     # primitives + audioPlayer + i18n + language-aware
src/components/Flashcards.tsx         # ditto
src/components/GrammarHelper.tsx      # ditto
src/components/PronunciationChecker.tsx # ditto
src/components/LiveTutor.tsx          # ditto
server.ts                             # remove /api/save-audio + /audio/* static
ai_backend/routers/grammar.py         # accept {native, target}; pull prompt from prompts.py
ai_backend/routers/pronunciation.py   # accept {native, target}
ai_backend/routers/tts.py             # accept target; tune prompt per language
ai_backend/routers/live.py            # (minor) system_instruction already comes from client
```

### Deleted files

```
src/lib/audioCache.ts                 # superseded by audioPlayer
```

---

## Phase 1 — Foundation (tokens + primitives)

### Task 1: Install Vitest and jsdom

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Add Vitest and jsdom as devDependencies**

Run:
```bash
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

Expected: packages appear in `package.json > devDependencies`.

- [ ] **Step 2: Add test scripts**

Edit `package.json` `scripts` section:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Sanity-check**

Run: `npm test`
Expected: Vitest starts, finds 0 tests, exits 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest + jsdom for unit tests"
```

---

### Task 2: Port design tokens into `src/index.css`

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace `src/index.css` entirely with token-based theme**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;500;600;700&family=Noto+Serif:ital,wght@0,400;0,600;1,400&display=swap');
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  /* Surfaces */
  --color-cream:     #FDFBF7;
  --color-paper:     #FFFFFF;
  --color-parchment: #F2EFE9;
  --color-sand:      #EBE5D9;

  /* Ink */
  --color-ink:       #2D2A26;
  --color-ink-deep:  #1A1816;
  --color-stone:     #6B655B;
  --color-mist:      #A39E93;

  /* Accents */
  --color-vermillion:      #C8102E;
  --color-vermillion-deep: #A00D25;
  --color-saffron:         #E8A33D;
  --color-saffron-deep:    #C68324;
  --color-lapis:           #2E5CB8;
  --color-lapis-deep:      #1E4096;
  --color-jade:            #047857;
  --color-jade-deep:       #036349;

  /* Semantic */
  --color-amber:        #92400E;
  --color-amber-soft:   #FFFBEB;
  --color-amber-border: #FDE68A;
  --color-rose:         #B91C1C;
  --color-rose-soft:    #FEF2F2;
  --color-rose-border:  #FECACA;
  --color-lapis-info:         #1E40AF;
  --color-lapis-info-soft:    #EFF6FF;
  --color-lapis-info-border:  #BFDBFE;
  --color-jade-soft:    #F0FDF4;
  --color-jade-border:  #BBF7D0;

  /* Fonts */
  --font-sans:  "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-cjk:   "Noto Serif SC", "Songti SC", ui-serif, Georgia, serif;
  --font-serif: "Noto Serif", Georgia, "Times New Roman", serif;

  /* Radii */
  --radius-xs:   6px;
  --radius-sm:   10px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-2xl:  32px;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(45,42,38,0.04);
  --shadow-sm: 0 1px 3px rgba(45,42,38,0.06), 0 1px 2px rgba(45,42,38,0.04);
  --shadow-md: 0 4px 12px rgba(45,42,38,0.08);
  --shadow-lg: 0 12px 32px rgba(45,42,38,0.10);
  --shadow-inner: inset 0 2px 4px rgba(45,42,38,0.04);

  /* Motion */
  --ease-out:      cubic-bezier(0.22, 1, 0.36, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 500ms;
}

:root {
  /* Aliases used inline; the @theme block above powers Tailwind utilities */
  --bg:        var(--color-cream);
  --bg-elev:   var(--color-paper);
  --bg-sunken: var(--color-parchment);
  --border:    var(--color-sand);
  --fg1:       var(--color-ink);
  --fg2:       var(--color-stone);
  --fg3:       var(--color-mist);
  --accent:       var(--color-vermillion);
  --accent-deep:  var(--color-vermillion-deep);
  --accent-tint:  rgba(200, 16, 46, 0.10);
  --accent-glow:  rgba(200, 16, 46, 0.20);
  --halo-accent:  0 0 0 12px var(--accent-tint);
}

@layer utilities {
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .cjk, .chinese-text { font-family: var(--font-cjk); font-weight: 500; }
  .pinyin { font-family: var(--font-sans); color: var(--color-vermillion); font-weight: 500; letter-spacing: 0.04em; }
  .eyebrow { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--fg3); }
}

html, body {
  background: var(--bg);
  color: var(--fg1);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
::selection { background: var(--accent-tint); color: var(--accent); }
```

- [ ] **Step 2: Verify Tailwind picks up the new color tokens**

Run: `npm run lint`
Expected: PASS — no type errors.

Run: `npm run dev:frontend`
Expected: App boots on :3000, looks identical to before (existing hex literals in components still work).

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: port design system tokens to index.css @theme"
```

---

### Task 3: Copy brand asset SVGs

**Files:**
- Create: `src/assets/logo-mark.svg`
- Create: `src/assets/logo-lockup.svg`
- Create: `src/assets/logo-lockup-dark.svg`

- [ ] **Step 1: Copy the three SVGs from design system into repo**

```bash
mkdir -p src/assets
cp "/Users/mac074/Downloads/Umay Design System/assets/logo-mark.svg" src/assets/
cp "/Users/mac074/Downloads/Umay Design System/assets/logo-lockup.svg" src/assets/
cp "/Users/mac074/Downloads/Umay Design System/assets/logo-lockup-dark.svg" src/assets/
```

- [ ] **Step 2: Verify import works**

Run: `ls -la src/assets/`
Expected: Three SVG files present.

- [ ] **Step 3: Commit**

```bash
git add src/assets/
git commit -m "feat: add Umay brand asset SVGs (logo mark + lockups)"
```

---

### Task 4: Build `LogoMark` primitive

**Files:**
- Create: `src/components/ui/LogoMark.tsx`

- [ ] **Step 1: Write the component**

```tsx
type Props = {
  size?: number;
  className?: string;
};

export default function LogoMark({ size = 40, className = '' }: Props) {
  return (
    <div
      className={`inline-flex items-center justify-center shadow-sm shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: 'var(--accent)',
      }}
    >
      <svg viewBox="0 0 120 120" width={size * 0.82} height={size * 0.82} aria-label="Umay">
        <g fill="#FDFBF7">
          <rect x="24" y="86" width="72" height="6" rx="3" />
          <path d="M 33 86 C 33 70, 36 58, 44 48 L 49 52 C 42 61, 39 72, 39 86 Z" />
          <path d="M 87 86 C 87 70, 84 58, 76 48 L 71 52 C 78 61, 81 72, 81 86 Z" />
          <rect x="56" y="34" width="8" height="54" rx="3" />
          <circle cx="60" cy="24" r="6" />
        </g>
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/LogoMark.tsx
git commit -m "feat(ui): add LogoMark primitive"
```

---

### Task 5: Build `Pill` primitive

**Files:**
- Create: `src/components/ui/Pill.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { ReactNode } from 'react';

type Variant = 'category' | 'nav';
type Props = {
  active?: boolean;
  variant?: Variant;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
};

export default function Pill({ active = false, variant = 'category', onClick, className = '', children }: Props) {
  const base = 'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors';
  const cls = active
    ? variant === 'nav'
      ? 'bg-[var(--bg-sunken)] text-[var(--fg1)] border border-transparent'
      : 'bg-[var(--fg1)] text-white border border-[var(--fg1)] shadow-md'
    : variant === 'nav'
      ? 'bg-transparent text-[var(--fg2)] border border-transparent hover:text-[var(--fg1)] hover:bg-[var(--bg-sunken)]'
      : 'bg-[var(--bg-elev)] text-[var(--fg2)] border border-[var(--border)] hover:bg-[var(--bg-sunken)]';
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls} ${className}`}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Pill.tsx
git commit -m "feat(ui): add Pill primitive (nav + category variants)"
```

---

### Task 6: Build `IconButton` primitive

**Files:**
- Create: `src/components/ui/IconButton.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { LucideIcon } from 'lucide-react';

type Tone = 'ink' | 'stone' | 'onSurface';
type Props = {
  icon: LucideIcon;
  onClick?: () => void;
  tone?: Tone;
  size?: number;
  loading?: boolean;
  title?: string;
  className?: string;
};

export default function IconButton({ icon: Icon, onClick, tone = 'ink', size = 44, loading = false, title, className = '' }: Props) {
  const fg = tone === 'stone' ? 'text-[var(--fg2)]' : 'text-[var(--fg1)]';
  const bg = tone === 'onSurface' ? 'bg-[var(--bg-elev)]' : 'bg-[var(--bg)]';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center rounded-full border border-[var(--border)] shadow-xs transition-colors hover:bg-[var(--bg-sunken)] ${bg} ${fg} ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon className={loading ? 'animate-spin' : ''} style={{ width: 20, height: 20 }} strokeWidth={1.75} />
    </button>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/IconButton.tsx
git commit -m "feat(ui): add IconButton primitive"
```

---

### Task 7: Build `Card` primitive

**Files:**
- Create: `src/components/ui/Card.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  hero?: boolean;       // use 32px radius instead of 24px
  sunken?: boolean;     // recessed surface with inner shadow
  padding?: number;     // px
  className?: string;
};

export default function Card({ children, hero = false, sunken = false, padding = 24, className = '' }: Props) {
  const bg = sunken ? 'bg-[var(--bg-sunken)]' : 'bg-[var(--bg-elev)]';
  const shadow = sunken ? '' : 'shadow-sm';
  return (
    <div
      className={`border border-[var(--border)] ${bg} ${shadow} ${className}`}
      style={{
        borderRadius: hero ? 32 : 24,
        padding,
        boxShadow: sunken ? 'var(--shadow-inner)' : undefined,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Card.tsx
git commit -m "feat(ui): add Card primitive"
```

---

### Task 8: Build `HeroIconTile`, `SectionHeading`, `Eyebrow` primitives

**Files:**
- Create: `src/components/ui/HeroIconTile.tsx`
- Create: `src/components/ui/SectionHeading.tsx`
- Create: `src/components/ui/Eyebrow.tsx`

- [ ] **Step 1: Write `HeroIconTile.tsx`**

```tsx
import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  color?: string;  // CSS color (var or literal)
  tint?: string;   // background CSS color
  className?: string;
};

export default function HeroIconTile({ icon: Icon, color = 'var(--fg1)', tint = 'rgba(45,42,38,0.05)', className = '' }: Props) {
  return (
    <div className={`inline-flex ${className}`} style={{ padding: 14, background: tint, borderRadius: 18, color }}>
      <Icon style={{ width: 24, height: 24 }} strokeWidth={1.75} />
    </div>
  );
}
```

- [ ] **Step 2: Write `SectionHeading.tsx`**

```tsx
type Props = {
  title: string;
  subtitle?: string;
  className?: string;
};

export default function SectionHeading({ title, subtitle, className = '' }: Props) {
  return (
    <div className={className}>
      <h2 className="text-2xl font-semibold text-[var(--fg1)] tracking-tight m-0">{title}</h2>
      {subtitle && <p className="mt-1.5 text-sm text-[var(--fg2)] leading-relaxed m-0">{subtitle}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Write `Eyebrow.tsx`**

```tsx
import type { ReactNode } from 'react';

export default function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}
```

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/HeroIconTile.tsx src/components/ui/SectionHeading.tsx src/components/ui/Eyebrow.tsx
git commit -m "feat(ui): add HeroIconTile, SectionHeading, Eyebrow primitives"
```

---

### Task 9: Build `Header` primitive

**Files:**
- Create: `src/components/ui/Header.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { BookOpen, Layers, BrainCircuit, Mic, MessageCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LogoMark from './LogoMark';
import Pill from './Pill';

export type Tab = 'vocabulary' | 'flashcards' | 'grammar' | 'pronunciation' | 'live';

type Props = {
  tab: Tab;
  setTab: (t: Tab) => void;
  languagePair?: { nativeFlag: string; targetFlag: string; onChange: () => void };
};

const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'vocabulary', label: 'Kelimeler', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'grammar', label: 'Dilbilgisi', icon: BrainCircuit },
  { id: 'pronunciation', label: 'Telaffuz', icon: Mic },
  { id: 'live', label: 'Canlı Pratik', icon: MessageCircle },
];

export default function Header({ tab, setTab, languagePair }: Props) {
  return (
    <header
      className="sticky top-0 z-10 border-b border-[var(--border)]"
      style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <h1 className="m-0 text-xl font-bold tracking-tight text-[var(--fg1)]">Umay</h1>
        </div>
        <nav className="hidden md:flex gap-1 items-center">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <Pill key={t.id} variant="nav" active={tab === t.id} onClick={() => setTab(t.id)}>
                <Icon style={{ width: 16, height: 16 }} strokeWidth={1.75} />
                {t.label}
              </Pill>
            );
          })}
          {languagePair && (
            <button
              type="button"
              onClick={languagePair.onChange}
              title="Change languages"
              className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--fg1)] hover:bg-[var(--bg)]"
            >
              <span>{languagePair.nativeFlag}</span>
              <span className="text-[var(--fg3)]">→</span>
              <span>{languagePair.targetFlag}</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Header.tsx
git commit -m "feat(ui): add Header primitive with nav pills and language pair slot"
```

---

### Task 10: Replace `App.tsx` header with the `Header` primitive (visual refresh)

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Rewrite `App.tsx`**

```tsx
import { useState } from 'react';
import Header, { type Tab } from './components/ui/Header';
import VocabularyList from './components/VocabularyList';
import GrammarHelper from './components/GrammarHelper';
import PronunciationChecker from './components/PronunciationChecker';
import LiveTutor from './components/LiveTutor';
import Flashcards from './components/Flashcards';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('vocabulary');

  const renderContent = () => {
    switch (activeTab) {
      case 'vocabulary':    return <VocabularyList />;
      case 'grammar':       return <GrammarHelper />;
      case 'pronunciation': return <PronunciationChecker />;
      case 'live':          return <LiveTutor />;
      case 'flashcards':    return <Flashcards />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg1)] font-sans">
      <Header tab={activeTab} setTab={setActiveTab} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
```

Note: mobile bottom-tab bar is temporarily dropped; it returns with the component-port pass in Phase 6.

- [ ] **Step 2: Type-check and visually verify**

Run: `npm run lint`
Expected: PASS.

Run: `npm run dev:frontend`
Expected: App boots; header shows the new `LogoMark` + wordmark + nav pills. Tabs still switch.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: use Header primitive in App shell (visual refresh)"
```

---

## Phase 2 — Vocabulary data model

### Task 11: Migrate `vocabulary.ts` schema (add optional `audio` field)

**Files:**
- Modify: `src/data/vocabulary.ts`

- [ ] **Step 1: Read current file header and extend the interface**

Open `src/data/vocabulary.ts`. Replace the `VocabularyWord` interface block with:

```ts
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
```

Leave the existing `VOCABULARY` array as-is — the field is optional, so existing rows stay valid.

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/data/vocabulary.ts
git commit -m "refactor(vocab): extend VocabularyWord with optional audio URIs"
```

---

### Task 12: Write `sync-vocab` script tests

**Files:**
- Create: `scripts/sync-vocab.test.ts`
- Create: `scripts/__fixtures__/rows.json`

- [ ] **Step 1: Create fixture with 2 rows representing the HF API response shape**

`scripts/__fixtures__/rows.json`:

```json
{
  "rows": [
    {
      "row_idx": 0,
      "row": {
        "hanzi": "你好",
        "pinyin": "nǐ hǎo",
        "turkish": "Merhaba",
        "english": "Hello",
        "example_zh": "你好，朋友。",
        "example_tr": "Merhaba, arkadaşım.",
        "example_en": "Hello, friend.",
        "category": "greetings",
        "audio_hanzi_normal": "https://hf.co/bucket/hanzi/normal/row_0.wav",
        "audio_hanzi_slow":   "https://hf.co/bucket/hanzi/slow/row_0.wav",
        "audio_english_normal": "https://hf.co/bucket/en/normal/row_0.wav",
        "audio_english_slow":   "https://hf.co/bucket/en/slow/row_0.wav",
        "audio_example_zh_normal": null,
        "audio_example_zh_slow":   null,
        "audio_example_en_normal": null,
        "audio_example_en_slow":   null
      }
    },
    {
      "row_idx": 1,
      "row": {
        "hanzi": "谢谢",
        "pinyin": "xiè xie",
        "turkish": "Teşekkürler",
        "english": "Thank you",
        "example_zh": null,
        "example_tr": null,
        "example_en": null,
        "category": "greetings"
      }
    }
  ]
}
```

- [ ] **Step 2: Write the test**

`scripts/sync-vocab.test.ts`:

```ts
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
    // Row 0 should have both hanzi and english audio nested
    expect(out).toMatch(/"audio":\s*\{[\s\S]*?"hanzi":\s*\{\s*"normal":\s*"https:\/\/hf\.co\/bucket\/hanzi\/normal\/row_0\.wav"/);
    expect(out).toMatch(/"english":\s*\{\s*"normal":\s*"https:\/\/hf\.co\/bucket\/en\/normal\/row_0\.wav"/);
  });

  it('omits audio entirely when no URIs are present', () => {
    const out = rowsToVocabularyTs(fixture.rows.map(r => r.row));
    // Row 1 has no audio columns populated
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './sync-vocab'` (script doesn't exist yet).

- [ ] **Step 4: Commit the failing test**

```bash
git add scripts/sync-vocab.test.ts scripts/__fixtures__/rows.json
git commit -m "test(sync-vocab): add failing tests for row-to-TS transformer"
```

---

### Task 13: Implement the `sync-vocab` script

**Files:**
- Create: `scripts/sync-vocab.ts`
- Modify: `package.json` (add `sync-vocab` script)

- [ ] **Step 1: Implement the transformer and HTTP fetcher**

```ts
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

const AUDIO_COLS: Array<[keyof AudioNest, string, string]> = [
  ['hanzi',      'audio_hanzi_normal',      'audio_hanzi_slow'],
  ['english',    'audio_english_normal',    'audio_english_slow'],
  ['turkish',    'audio_turkish_normal',    'audio_turkish_slow'],
  ['example_zh', 'audio_example_zh_normal', 'audio_example_zh_slow'],
  ['example_en', 'audio_example_en_normal', 'audio_example_en_slow'],
  ['example_tr', 'audio_example_tr_normal', 'audio_example_tr_slow'],
];

function buildAudio(row: HFRow): AudioNest | undefined {
  const nest: AudioNest = {};
  for (const [key, nCol, sCol] of AUDIO_COLS) {
    const n = row[nCol];
    const s = row[sCol];
    if (typeof n === 'string' && typeof s === 'string' && n && s) {
      nest[key] = { normal: n, slow: s };
    }
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
    turkish:    row.turkish,
    english:    row.english,
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
  // First request tells us total rows via `num_rows_total`.
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

// Only run when invoked directly (not when imported by tests)
const invokedDirectly = typeof process !== 'undefined' && process.argv[1]?.endsWith('sync-vocab.ts');
if (invokedDirectly) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 2: Add `sync-vocab` script to `package.json`**

In the `scripts` block add:
```json
"sync-vocab": "tsx scripts/sync-vocab.ts"
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all 4 tests in `scripts/sync-vocab.test.ts`.

- [ ] **Step 4: Dry-run the real fetch (optional manual check)**

Run: `npm run sync-vocab`
Expected: Console prints row count and writes `src/data/vocabulary.ts`. If the bucket columns aren't uploaded yet, audio fields are simply absent; the file is still valid.

- [ ] **Step 5: Commit (without regenerating the real vocabulary.ts yet)**

```bash
git checkout -- src/data/vocabulary.ts  # revert any generated file; we'll regenerate deliberately later
git add scripts/sync-vocab.ts package.json
git commit -m "feat(scripts): add sync-vocab to regenerate src/data/vocabulary.ts from HF"
```

Note: the user regenerates `src/data/vocabulary.ts` when they're ready (explicit step, outside this plan's scope).

---

## Phase 3 — i18n core

### Task 14: Write i18n strings module and tests

**Files:**
- Create: `src/i18n/strings.ts`
- Create: `src/i18n/index.ts`
- Create: `src/i18n/__tests__/i18n.test.ts`

- [ ] **Step 1: Write the strings module**

`src/i18n/strings.ts`:

```ts
export type LangCode = 'tr' | 'en' | 'zh';

export const LANG_META: Record<LangCode, { name: string; english: string; flag: string }> = {
  tr: { name: 'Türkçe',  english: 'Turkish', flag: '🇹🇷' },
  en: { name: 'English', english: 'English', flag: '🇬🇧' },
  zh: { name: '中文',    english: 'Chinese', flag: '🇨🇳' },
};

type Dict = Record<string, string>;

export const STRINGS: Record<LangCode, Dict> = {
  tr: {
    'picker.step1.eyebrow': 'BAŞLAYALIM · 1/2',
    'picker.step1.title':   'Ana dilin hangisi?',
    'picker.step1.sub':     'Açıklamalar ve çeviriler bu dilde gösterilecek.',
    'picker.step2.eyebrow': 'SON ADIM · 2/2',
    'picker.step2.title':   'Hangi dili öğrenmek istiyorsun?',
    'picker.step2.sub':     'Kelimeler, flashcardlar ve pratik bu dile göre hazırlanacak.',
    'picker.back':          'Geri',
    'picker.cta':           'Başla',
    'picker.change':        'Dili değiştir',
    'picker.comingSoon':    'Yakında',

    'tab.vocabulary':    'Kelimeler',
    'tab.flashcards':    'Flashcards',
    'tab.grammar':       'Dilbilgisi',
    'tab.pronunciation': 'Telaffuz',
    'tab.live':          'Canlı Pratik',

    'vocab.title':     'Temel Kelimeler',
    'vocab.searchPh':  'Ara...',
    'vocab.empty':     'Aramanızla eşleşen kelime bulunamadı.',
    'vocab.playNormal':'Normal Dinle',
    'vocab.playSlow':  'Yavaş Dinle',
    'vocab.cat.all':   'Tümü',

    'flash.title':       'Akıllı Tekrar',
    'flash.flipPrompt':  'Cevabı görmek için karta tıklayın',
    'flash.again':       'Tekrar',
    'flash.hard':        'Zor',
    'flash.good':        'İyi',
    'flash.easy':        'Kolay',
    'flash.allDone':     'Harika! Tüm kartları bitirdin.',

    'grammar.title':     'Dilbilgisi Asistanı',
    'grammar.prompt':    'Bir dilbilgisi konusu sor',
    'grammar.loading':   'Düşünüyorum...',

    'pron.title':        'Telaffuz Kontrolü',
    'pron.targetLabel':  'HEDEF KELİME',
    'pron.micPrompt':    'Kayda başlamak için mikrofona tıklayın.',
    'pron.scoreLabel':   'Puan',

    'live.title':        'Canlı Pratik',
    'live.connect':      'Bağlan',
    'live.connecting':   'Bağlanıyor...',
    'live.endCall':      'Görüşmeyi bitir',

    'common.error':      'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
  },
  en: {
    'picker.step1.eyebrow': "LET'S START · 1/2",
    'picker.step1.title':   'What is your native language?',
    'picker.step1.sub':     'Explanations and translations will appear in this language.',
    'picker.step2.eyebrow': 'LAST STEP · 2/2',
    'picker.step2.title':   'Which language do you want to learn?',
    'picker.step2.sub':     'Vocabulary, flashcards and practice will be tailored to it.',
    'picker.back':          'Back',
    'picker.cta':           'Start',
    'picker.change':        'Change languages',
    'picker.comingSoon':    'Coming soon',

    'tab.vocabulary':    'Vocabulary',
    'tab.flashcards':    'Flashcards',
    'tab.grammar':       'Grammar',
    'tab.pronunciation': 'Pronunciation',
    'tab.live':          'Live Tutor',

    'vocab.title':     'Core Vocabulary',
    'vocab.searchPh':  'Search...',
    'vocab.empty':     'No words match your search.',
    'vocab.playNormal':'Play normal',
    'vocab.playSlow':  'Play slow',
    'vocab.cat.all':   'All',

    'flash.title':       'Smart Review',
    'flash.flipPrompt':  'Tap the card to see the answer',
    'flash.again':       'Again',
    'flash.hard':        'Hard',
    'flash.good':        'Good',
    'flash.easy':        'Easy',
    'flash.allDone':     "Nice! You've finished all cards.",

    'grammar.title':     'Grammar Helper',
    'grammar.prompt':    'Ask a grammar question',
    'grammar.loading':   'Thinking...',

    'pron.title':        'Pronunciation Check',
    'pron.targetLabel':  'TARGET WORD',
    'pron.micPrompt':    'Tap the microphone to start recording.',
    'pron.scoreLabel':   'Score',

    'live.title':        'Live Tutor',
    'live.connect':      'Connect',
    'live.connecting':   'Connecting...',
    'live.endCall':      'End call',

    'common.error':      'Sorry, an error occurred. Please try again.',
  },
  zh: {
    'picker.step1.eyebrow': '开始吧 · 1/2',
    'picker.step1.title':   '你的母语是什么？',
    'picker.step1.sub':     '说明和翻译将以这种语言显示。',
    'picker.step2.eyebrow': '最后一步 · 2/2',
    'picker.step2.title':   '你想学哪种语言？',
    'picker.step2.sub':     '词汇、卡片和练习都会针对这门语言准备。',
    'picker.back':          '返回',
    'picker.cta':           '开始',
    'picker.change':        '更换语言',
    'picker.comingSoon':    '即将推出',

    'tab.vocabulary':    '词汇',
    'tab.flashcards':    '卡片',
    'tab.grammar':       '语法',
    'tab.pronunciation': '发音',
    'tab.live':          '实时对话',

    'vocab.title':     '常用词汇',
    'vocab.searchPh':  '搜索...',
    'vocab.empty':     '没有匹配的词。',
    'vocab.playNormal':'正常播放',
    'vocab.playSlow':  '慢速播放',
    'vocab.cat.all':   '全部',

    'flash.title':       '智能复习',
    'flash.flipPrompt':  '点击卡片查看答案',
    'flash.again':       '重来',
    'flash.hard':        '困难',
    'flash.good':        '良好',
    'flash.easy':        '简单',
    'flash.allDone':     '完成所有卡片！',

    'grammar.title':     '语法助手',
    'grammar.prompt':    '问一个语法问题',
    'grammar.loading':   '思考中...',

    'pron.title':        '发音检查',
    'pron.targetLabel':  '目标词',
    'pron.micPrompt':    '点击麦克风开始录音。',
    'pron.scoreLabel':   '分数',

    'live.title':        '实时对话',
    'live.connect':      '连接',
    'live.connecting':   '连接中...',
    'live.endCall':      '结束通话',

    'common.error':      '抱歉，发生错误。请重试。',
  },
};
```

- [ ] **Step 2: Write the lookup helper**

`src/i18n/index.ts`:

```ts
import { STRINGS, type LangCode } from './strings';
export type { LangCode } from './strings';
export { LANG_META } from './strings';

export function t(lang: LangCode, key: string): string {
  return STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
}
```

- [ ] **Step 3: Write tests**

`src/i18n/__tests__/i18n.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { t } from '../index';

describe('t()', () => {
  it('returns the string in the requested language', () => {
    expect(t('tr', 'picker.back')).toBe('Geri');
    expect(t('en', 'picker.back')).toBe('Back');
    expect(t('zh', 'picker.back')).toBe('返回');
  });

  it('falls back to English when a key is missing for the target lang', () => {
    // (This test is defensive; our dicts are exhaustive today.)
    // @ts-expect-error — intentionally missing key
    expect(t('zh', 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('returns the raw key when no language has the string', () => {
    expect(t('tr', 'totally.unknown')).toBe('totally.unknown');
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS — 3 new tests (plus 4 from the previous task).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/
git commit -m "feat(i18n): add tr/en/zh string table and t() lookup helper"
```

---

### Task 15: Build `LanguageContext` provider

**Files:**
- Create: `src/context/LanguageContext.tsx`

- [ ] **Step 1: Write the context and hook**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LangCode } from '../i18n';
import { t as tFn } from '../i18n';

const STORAGE_NATIVE = 'umay_native';
const STORAGE_TARGET = 'umay_target';

type Pair = { native: LangCode; target: LangCode };

type Ctx = {
  pair: Pair | null;
  setPair: (p: Pair) => void;
  resetPair: () => void;
  t: (key: string) => string;  // reads from current native
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [pair, setPairState] = useState<Pair | null>(() => {
    if (typeof window === 'undefined') return null;
    const n = localStorage.getItem(STORAGE_NATIVE) as LangCode | null;
    const t = localStorage.getItem(STORAGE_TARGET) as LangCode | null;
    if (n && t && n !== t) return { native: n, target: t };
    return null;
  });

  useEffect(() => {
    if (pair) {
      localStorage.setItem(STORAGE_NATIVE, pair.native);
      localStorage.setItem(STORAGE_TARGET, pair.target);
    }
  }, [pair]);

  const setPair = (p: Pair) => setPairState(p);
  const resetPair = () => {
    localStorage.removeItem(STORAGE_NATIVE);
    localStorage.removeItem(STORAGE_TARGET);
    setPairState(null);
  };

  const t = (key: string) => tFn(pair?.native ?? 'tr', key);

  return (
    <LanguageContext.Provider value={{ pair, setPair, resetPair, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/context/LanguageContext.tsx
git commit -m "feat(i18n): add LanguageContext with localStorage persistence"
```

---

### Task 16: Build `LanguagePicker` component

**Files:**
- Create: `src/components/LanguagePicker.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useState } from 'react';
import LogoMark from './ui/LogoMark';
import Eyebrow from './ui/Eyebrow';
import { LANG_META, type LangCode } from '../i18n';
import { useLanguage } from '../context/LanguageContext';

const LANGS: LangCode[] = ['tr', 'en', 'zh'];

// v2-gated combinations: disable until Turkish audio lands.
const V2_PAIRS: Array<{ native: LangCode; target: LangCode }> = [
  { native: 'zh', target: 'tr' },
  { native: 'en', target: 'tr' },
];

function isV2(native: LangCode, target: LangCode) {
  return V2_PAIRS.some(p => p.native === native && p.target === target);
}

function LangCard({
  code, selected, disabled, note, onClick,
}: { code: LangCode; selected: boolean; disabled: boolean; note?: string; onClick: () => void }) {
  const meta = LANG_META[code];
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex flex-col items-start gap-2 text-left rounded-[20px] px-5 py-5 min-h-[120px] border transition-all ${
        selected
          ? 'bg-[var(--fg1)] text-white border-[var(--fg1)] shadow-md'
          : disabled
          ? 'bg-[var(--bg-elev)] text-[var(--fg3)] border-[var(--border)] opacity-40 cursor-not-allowed'
          : 'bg-[var(--bg-elev)] text-[var(--fg1)] border-[var(--border)] shadow-sm hover:border-[var(--fg2)]'
      }`}
    >
      <span className="text-3xl leading-none">{meta.flag}</span>
      <span className="text-[17px] font-semibold tracking-tight">{meta.name}</span>
      <span className={`text-xs font-semibold uppercase tracking-[0.08em] ${selected ? 'text-white/65' : 'text-[var(--fg3)]'}`}>
        {meta.english}
      </span>
      {note && <span className={`text-xs ${selected ? 'text-white/80' : 'text-[var(--fg3)]'}`}>{note}</span>}
    </button>
  );
}

export default function LanguagePicker() {
  const { setPair, t } = useLanguage();
  const [step, setStep] = useState<1 | 2>(1);
  const [native, setNative] = useState<LangCode | null>(null);
  const [target, setTarget] = useState<LangCode | null>(null);

  const finish = () => {
    if (native && target) setPair({ native, target });
  };

  const stepT = (k: string) => t(k);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center px-8 pt-14 pb-20">
      <div className="flex items-center gap-3 mb-12">
        <LogoMark size={48} />
        <h1 className="m-0 text-[26px] font-bold tracking-tight text-[var(--fg1)]">Umay</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {[1, 2].map(n => (
          <span
            key={n}
            className="h-2 rounded-full transition-all duration-200"
            style={{
              width: n === step ? 28 : 8,
              background: n <= step ? 'var(--accent)' : 'var(--border)',
            }}
          />
        ))}
      </div>

      <div className="max-w-[720px] w-full text-center mb-10">
        <Eyebrow>{stepT(step === 1 ? 'picker.step1.eyebrow' : 'picker.step2.eyebrow')}</Eyebrow>
        <h2 className="mt-2.5 mb-2 text-[32px] font-semibold tracking-tight text-[var(--fg1)]">
          {stepT(step === 1 ? 'picker.step1.title' : 'picker.step2.title')}
        </h2>
        <p className="m-0 text-[15px] text-[var(--fg2)]">
          {stepT(step === 1 ? 'picker.step1.sub' : 'picker.step2.sub')}
        </p>
      </div>

      <div className="max-w-[720px] w-full grid grid-cols-3 gap-3.5 mb-8">
        {LANGS.map(code => {
          if (step === 1) {
            return (
              <LangCard
                key={code}
                code={code}
                selected={native === code}
                disabled={false}
                onClick={() => setNative(code)}
              />
            );
          }
          const sameAsNative = code === native;
          const v2 = native ? isV2(native, code) : false;
          return (
            <LangCard
              key={code}
              code={code}
              selected={target === code}
              disabled={sameAsNative || v2}
              note={v2 ? stepT('picker.comingSoon') : undefined}
              onClick={() => setTarget(code)}
            />
          );
        })}
      </div>

      <div className="max-w-[720px] w-full flex justify-between items-center">
        <button
          type="button"
          onClick={() => step === 2 && setStep(1)}
          disabled={step === 1}
          className={`bg-transparent border-0 px-0 py-2.5 text-sm font-medium ${
            step === 1 ? 'text-[var(--fg3)] cursor-default' : 'text-[var(--fg2)] cursor-pointer'
          }`}
        >
          ← {stepT('picker.back')}
        </button>
        <button
          type="button"
          onClick={() => (step === 1 ? (native && setStep(2)) : (target && finish()))}
          disabled={step === 1 ? !native : !target}
          className="rounded-full px-8 py-3.5 text-[15px] font-semibold text-white border-0"
          style={{
            background: 'var(--accent)',
            opacity: (step === 1 ? !native : !target) ? 0.35 : 1,
            boxShadow: '0 4px 12px rgba(200,16,46,0.22)',
          }}
        >
          {stepT('picker.cta')} →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/LanguagePicker.tsx
git commit -m "feat(i18n): add LanguagePicker (2-step onboarding, tr/en/zh)"
```

---

### Task 17: Gate `App.tsx` on the `LanguagePicker`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Wrap with `LanguageProvider` and gate on pair presence**

Replace `src/App.tsx` with:

```tsx
import { useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { LANG_META } from './i18n';
import Header, { type Tab } from './components/ui/Header';
import LanguagePicker from './components/LanguagePicker';
import VocabularyList from './components/VocabularyList';
import GrammarHelper from './components/GrammarHelper';
import PronunciationChecker from './components/PronunciationChecker';
import LiveTutor from './components/LiveTutor';
import Flashcards from './components/Flashcards';

function Shell() {
  const { pair, resetPair } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('vocabulary');

  if (!pair) return <LanguagePicker />;

  const renderContent = () => {
    switch (activeTab) {
      case 'vocabulary':    return <VocabularyList />;
      case 'grammar':       return <GrammarHelper />;
      case 'pronunciation': return <PronunciationChecker />;
      case 'live':          return <LiveTutor />;
      case 'flashcards':    return <Flashcards />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg1)] font-sans">
      <Header
        tab={activeTab}
        setTab={setActiveTab}
        languagePair={{
          nativeFlag: LANG_META[pair.native].flag,
          targetFlag: LANG_META[pair.target].flag,
          onChange: resetPair,
        }}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <Shell />
    </LanguageProvider>
  );
}
```

- [ ] **Step 2: Type-check + run**

Run: `npm run lint`
Expected: PASS.

Run: `npm run dev:frontend`
In the browser clear localStorage (`localStorage.clear(); location.reload()`).
Expected: LanguagePicker renders; choosing `tr` then `zh` → main app; header shows 🇹🇷 → 🇨🇳 pill; clicking pill resets to picker.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): gate Shell on LanguagePicker; wire language pill in Header"
```

---

## Phase 4 — Audio player core

### Task 18: Write `audioPlayer` tests

**Files:**
- Create: `src/lib/__tests__/audioPlayer.test.ts`

- [ ] **Step 1: Write tests against a stub `fetch` + the existing `generateSpeech`**

```ts
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
    expect(src.kind).toBe('buffer');
    expect(global.fetch).toHaveBeenCalledWith('/api/tts', expect.objectContaining({ method: 'POST' }));
  });

  it('returns null when URI missing and target lang has no Gemini fallback (tr)', async () => {
    const src = await resolveAudioSource(rowWithout, 'hanzi', 'normal', 'tr');
    expect(src).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../audioPlayer'`.

- [ ] **Step 3: Commit failing test**

```bash
git add src/lib/__tests__/audioPlayer.test.ts
git commit -m "test(audioPlayer): add failing tests for URI-first playback"
```

---

### Task 19: Implement `audioPlayer` module

**Files:**
- Create: `src/lib/audioPlayer.ts`

- [ ] **Step 1: Write the module**

```ts
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

// Targets where Gemini TTS fallback is wired. Turkish target is v2-gated,
// so a missing URI there returns null (caller hides the button).
const GEMINI_FALLBACK_TARGETS: LangCode[] = ['zh', 'en'];

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

async function callGeminiTts(text: string, isSlow: boolean): Promise<ArrayBuffer> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceName: 'Puck', isSlow }),
  });
  if (!res.ok) throw new Error(`TTS failed with status ${res.status}`);
  const { audio } = await res.json();
  if (!audio) throw new Error('No audio in TTS response');
  const bin = atob(audio);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export async function resolveAudioSource(
  row: VocabularyWord,
  field: AudioField,
  speed: AudioSpeed,
  target: LangCode,
): Promise<AudioSource | null> {
  const uri = pickAudioUri(row, field, speed);
  if (uri) return { kind: 'uri', src: uri };

  if (!GEMINI_FALLBACK_TARGETS.includes(target)) return null;
  const text = textFor(row, field);
  if (!text) return null;
  const buffer = await callGeminiTts(text, speed === 'slow');
  return { kind: 'buffer', buffer };
}
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS — all tests in `audioPlayer.test.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/audioPlayer.ts
git commit -m "feat(audio): add audioPlayer — URI-first with Gemini TTS fallback"
```

---

## Phase 5 — AI backend per-pair prompts

### Task 20: Add `ai_backend/prompts.py`

**Files:**
- Create: `ai_backend/prompts.py`

- [ ] **Step 1: Write the module**

```python
"""Per-(native, target) system prompts for Umay's AI features.

Keys are ``(native, target)`` tuples using ISO-639-1 codes (``tr``, ``en``,
``zh``). Each value is a dict keyed by feature name (``grammar``,
``pronunciation``, ``live``, ``tts_normal``, ``tts_slow``).

If a pair is missing, callers fall back to the ``("tr", "zh")`` defaults.
"""

from __future__ import annotations

LangPair = tuple[str, str]

LANGUAGE_NAME = {
    "tr": "Turkish",
    "en": "English",
    "zh": "Chinese",
}

def _grammar(target: str, native: str) -> str:
    tgt = LANGUAGE_NAME[target]
    nat = LANGUAGE_NAME[native]
    return (
        f"You are an expert {tgt} language teacher. "
        f"Explain {tgt} grammar concepts clearly in {nat}. "
        f"Provide examples in {tgt}; when helpful, include a {nat} translation."
    )


def _pronunciation(target: str, native: str) -> str:
    tgt = LANGUAGE_NAME[target]
    nat = LANGUAGE_NAME[native]
    return (
        f"You are evaluating a learner's {tgt} pronunciation. "
        f"Return JSON with score (0-100), feedback (in {nat}, plain prose), "
        f"and transcription (what you heard)."
    )


def _live(target: str, native: str) -> str:
    tgt = LANGUAGE_NAME[target]
    nat = LANGUAGE_NAME[native]
    return (
        f"You are a friendly {tgt} teacher for a {nat} speaker. "
        f"You speak both {nat} and {tgt}. Help the user practice their conversational "
        f"{tgt}. Correct mistakes gently. Keep responses concise."
    )


def _tts_prompt(target: str, isSlow: bool) -> str:
    tgt = LANGUAGE_NAME[target]
    qualifier = "very slowly, clearly and naturally" if isSlow else "clearly and naturally"
    tone_hint = ", emphasizing the tones" if target == "zh" else ""
    return f"Please speak the following {tgt} text {qualifier}{tone_hint}: {{text}}"


def for_pair(native: str, target: str) -> dict:
    if native not in LANGUAGE_NAME or target not in LANGUAGE_NAME or native == target:
        native, target = "tr", "zh"
    return {
        "grammar":       _grammar(target, native),
        "pronunciation": _pronunciation(target, native),
        "live":          _live(target, native),
        "tts_normal":    _tts_prompt(target, False),
        "tts_slow":      _tts_prompt(target, True),
    }
```

- [ ] **Step 2: Smoke-test**

Run:
```bash
cd ai_backend && uv run python -c "from prompts import for_pair; print(for_pair('en','zh')['grammar'])"
```
Expected: prints an English system prompt mentioning Chinese.

- [ ] **Step 3: Commit**

```bash
git add ai_backend/prompts.py
git commit -m "feat(ai): add per-pair system prompts module"
```

---

### Task 21: Thread `{native, target}` through the `grammar` router

**Files:**
- Modify: `ai_backend/routers/grammar.py`
- Modify: `src/lib/gemini.ts`

- [ ] **Step 1: Update `grammar.py`**

Replace the contents with:

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import litellm

from prompts import for_pair

router = APIRouter()


class GrammarRequest(BaseModel):
    query: str = Field(..., max_length=1000)
    native: str = Field(default="tr", pattern="^(tr|en|zh)$")
    target: str = Field(default="zh", pattern="^(tr|en|zh)$")


@router.post("/grammar")
async def grammar(body: GrammarRequest):
    system_instruction = for_pair(body.native, body.target)["grammar"]
    try:
        response = await litellm.acompletion(
            model="gemini/gemini-2.5-flash",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": body.query},
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grammar explanation failed: {e}")

    return {"text": response.choices[0].message.content}
```

- [ ] **Step 2: Update `explainGrammar` in `src/lib/gemini.ts`**

Find the `explainGrammar` function and replace it with:

```ts
import type { LangCode } from '../i18n';

export const explainGrammar = async (
  query: string,
  native: LangCode,
  target: LangCode,
) => {
  const response = await fetch('/api/grammar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, native, target }),
  });
  if (!response.ok) throw new Error('Grammar explanation failed');
  const { text } = await response.json();
  return text;
};
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: FAIL — `GrammarHelper.tsx` calls `explainGrammar(query)` with 1 arg now. Note the error; we'll fix it in the component port pass (Phase 6). For now, add a temporary two-step safeguard:

Edit `explainGrammar` to allow optional args for the transition period:

```ts
export const explainGrammar = async (
  query: string,
  native: LangCode = 'tr',
  target: LangCode = 'zh',
) => {
  // ... same body as above
};
```

Re-run lint. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add ai_backend/routers/grammar.py src/lib/gemini.ts
git commit -m "feat(grammar): accept {native, target} and select per-pair system prompt"
```

---

### Task 22: Thread `{native, target}` through the `pronunciation` router

**Files:**
- Modify: `ai_backend/routers/pronunciation.py`
- Modify: `src/lib/gemini.ts`

- [ ] **Step 1: Update `pronunciation.py`**

```python
import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import litellm

from prompts import for_pair, LANGUAGE_NAME

router = APIRouter()


class PronunciationRequest(BaseModel):
    base64Audio: str
    mimeType: str
    targetWord: str = Field(..., max_length=50)
    pinyin: str = ""
    native: str = Field(default="tr", pattern="^(tr|en|zh)$")
    target: str = Field(default="zh", pattern="^(tr|en|zh)$")


@router.post("/evaluate-pronunciation")
async def evaluate_pronunciation(body: PronunciationRequest):
    system_instruction = for_pair(body.native, body.target)["pronunciation"]
    target_lang = LANGUAGE_NAME[body.target]
    native_lang = LANGUAGE_NAME[body.native]

    hint = f' ({body.pinyin})' if body.target == "zh" and body.pinyin else ''
    prompt = (
        f'{system_instruction}\n\n'
        f'The user is trying to say the {target_lang} word "{body.targetWord}"{hint}. '
        'Listen to the audio and evaluate their pronunciation. '
        f'Return a JSON object with: {{"score": number (0-100), '
        f'"feedback": string (in {native_lang}, explain what was good and what needs improvement), '
        '"transcription": string (what you heard)}.'
    )

    try:
        response = await litellm.acompletion(
            model="gemini/gemini-2.5-flash",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "file",
                        "file": {"file_data": f"data:{body.mimeType};base64,{body.base64Audio}"},
                    },
                    {"type": "text", "text": prompt},
                ],
            }],
            response_format={"type": "json_object"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")

    try:
        return json.loads(response.choices[0].message.content or "{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON from model")
```

- [ ] **Step 2: Update `evaluatePronunciation` in `src/lib/gemini.ts`**

```ts
export const evaluatePronunciation = async (
  base64Audio: string,
  mimeType: string,
  targetWord: string,
  pinyin: string,
  native: LangCode = 'tr',
  target: LangCode = 'zh',
) => {
  const response = await fetch('/api/evaluate-pronunciation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Audio, mimeType, targetWord, pinyin, native, target }),
  });
  if (!response.ok) throw new Error('Pronunciation evaluation failed');
  return response.json();
};
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add ai_backend/routers/pronunciation.py src/lib/gemini.ts
git commit -m "feat(pronunciation): accept {native, target} and swap target language"
```

---

### Task 23: Thread `{target}` through the `tts` router

**Files:**
- Modify: `ai_backend/routers/tts.py`
- Modify: `src/lib/gemini.ts`

- [ ] **Step 1: Update `tts.py`**

```python
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import litellm

from prompts import for_pair

logger = logging.getLogger(__name__)

router = APIRouter()


class TTSRequest(BaseModel):
    text: str = Field(..., max_length=500)
    voiceName: str = "Puck"
    isSlow: bool = False
    target: str = Field(default="zh", pattern="^(tr|en|zh)$")


@router.post("/tts")
async def tts(body: TTSRequest):
    tpl_key = "tts_slow" if body.isSlow else "tts_normal"
    # Native is irrelevant for TTS; pair lookup just needs a valid native code
    prompt = for_pair("tr", body.target)[tpl_key].format(text=body.text)

    try:
        response = await litellm.acompletion(
            model="gemini/gemini-2.5-flash-preview-tts",
            messages=[{"role": "user", "content": prompt}],
            modalities=["audio"],
            audio={"voice": body.voiceName, "format": "pcm16"},
        )
    except litellm.RateLimitError as e:
        logger.warning("TTS rate limit exceeded: %s", e)
        raise HTTPException(status_code=429, detail=f"Rate limit exceeded: {e}")
    except Exception as e:
        logger.error("TTS generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}")

    if not response.choices:
        raise HTTPException(status_code=500, detail="No audio generated (empty response)")

    audio_resp = getattr(response.choices[0].message, "audio", None)
    if audio_resp and getattr(audio_resp, "data", None):
        return {"audio": audio_resp.data}

    raise HTTPException(status_code=500, detail="No audio generated")
```

- [ ] **Step 2: Update `audioPlayer.ts` and remove old `generateSpeech`**

Open `src/lib/audioPlayer.ts` and update `callGeminiTts` to send `target`:

```ts
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
  return bytes.buffer;
}
```

And update `resolveAudioSource` to pass `target` into the fallback call:

```ts
const buffer = await callGeminiTts(text, speed === 'slow', target);
```

- [ ] **Step 3: Remove `generateSpeech` from `src/lib/gemini.ts`**

Delete the `generateSpeech` function entirely. It's replaced by `resolveAudioSource`. Also delete the `getCachedAudioUrl`/`saveAudioToServer` imports at the top of the file.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS — `audioPlayer.test.ts` still green. Update the test fixture if it references the old signature (it shouldn't, but confirm).

Run: `npm run lint`
Expected: PASS or FAIL referencing callers of the now-deleted `generateSpeech`. Noted callers: `VocabularyList`, `Flashcards`, `PronunciationChecker`. These are fixed in Phase 6; to keep `lint` green in the interim, **temporarily** re-export a stub in `gemini.ts`:

```ts
// DEPRECATED — replaced by audioPlayer.resolveAudioSource. Removed in Phase 6.
export const generateSpeech = async (): Promise<ArrayBuffer> => {
  throw new Error('generateSpeech has been replaced by audioPlayer.resolveAudioSource');
};
```

Re-run lint. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ai_backend/routers/tts.py src/lib/audioPlayer.ts src/lib/gemini.ts
git commit -m "feat(tts): accept target language; route client calls through audioPlayer"
```

---

### Task 24: Thread `{native, target}` through the Live Tutor

**Files:**
- Modify: `src/hooks/useLiveAPI.ts`

The `live` router already reads `systemInstruction` from the client-sent config message — the Python side needs no change. We just need the hook to accept native/target and look up the right prompt.

- [ ] **Step 1: Update the hook to build its system instruction from a language pair**

Open `src/hooks/useLiveAPI.ts`. Add an import and change the `connect` signature:

Top of file, after existing imports:

```ts
import type { LangCode } from '../i18n';
import { LANGUAGE_NAME_EN, LIVE_SYSTEM_INSTRUCTION } from './liveInstructions';
```

Change `connect` to take `(args: { native: LangCode; target: LangCode })`:

```ts
const connect = useCallback(async ({ native, target }: { native: LangCode; target: LangCode }) => {
```

And inside, replace the hard-coded `systemInstruction` line with:

```ts
systemInstruction: LIVE_SYSTEM_INSTRUCTION(native, target),
```

- [ ] **Step 2: Create the supporting helper**

Create `src/hooks/liveInstructions.ts`:

```ts
import type { LangCode } from '../i18n';

export const LANGUAGE_NAME_EN: Record<LangCode, string> = {
  tr: 'Turkish',
  en: 'English',
  zh: 'Chinese',
};

export const LIVE_SYSTEM_INSTRUCTION = (native: LangCode, target: LangCode) => {
  const tgt = LANGUAGE_NAME_EN[target];
  const nat = LANGUAGE_NAME_EN[native];
  return `You are a friendly ${tgt} teacher for a ${nat} speaker. You speak both ${nat} and ${tgt}. Help the user practice their conversational ${tgt}. Correct their mistakes gently. Keep responses concise.`;
};
```

- [ ] **Step 3: Update callers — only `LiveTutor.tsx` uses this hook**

In `src/components/LiveTutor.tsx`, find the `connect()` call. It'll be addressed during Phase 6; for now, it will break lint. To keep lint green in the interim, give `connect` a default parameter in the hook:

```ts
const connect = useCallback(async (args: { native: LangCode; target: LangCode } = { native: 'tr', target: 'zh' }) => {
```

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useLiveAPI.ts src/hooks/liveInstructions.ts
git commit -m "feat(live): build system instruction from {native, target} pair"
```

---

## Phase 6 — Component port passes

Each task here refactors one feature component to:
- Use the new primitives (`Card`, `IconButton`, etc.) and color tokens instead of hex literals
- Read `{pair, t}` from `useLanguage()`
- Route TTS through `audioPlayer.resolveAudioSource()` and render per-row audio buttons
- Call AI endpoints with `native`/`target` forwarded

### Task 25: Refactor `VocabularyList.tsx`

**Files:**
- Modify: `src/components/VocabularyList.tsx`

- [ ] **Step 1: Rewrite the component**

(Because this file is large, do a full replace. Key points: use `Card`, `IconButton`, `Pill`, `SectionHeading`; resolve audio via `resolveAudioSource`; switch UI copy to `t()`; display the correct `script`/`translation` based on `pair.target` and `pair.native`.)

Replace the contents of `src/components/VocabularyList.tsx` with:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Volume2, Snail, Loader2 } from 'lucide-react';
import Card from './ui/Card';
import Pill from './ui/Pill';
import IconButton from './ui/IconButton';
import SectionHeading from './ui/SectionHeading';
import { VOCABULARY, type VocabularyWord } from '../data/vocabulary';
import { useLanguage } from '../context/LanguageContext';
import { resolveAudioSource, type AudioField, type AudioSpeed } from '../lib/audioPlayer';
import type { LangCode } from '../i18n';

function scriptAndTranslation(row: VocabularyWord, native: LangCode, target: LangCode) {
  const map: Record<LangCode, string> = {
    zh: row.hanzi,
    tr: row.turkish,
    en: row.english ?? '',
  };
  const scriptField: AudioField = target === 'zh' ? 'hanzi' : target === 'en' ? 'english' : 'turkish';
  return {
    script: map[target],
    translation: map[native],
    pinyin: target === 'zh' ? row.pinyin : '',
    audioField: scriptField,
    isCjk: target === 'zh',
  };
}

export default function VocabularyList() {
  const { pair, t } = useLanguage();
  const { native, target } = pair!;

  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [playing, setPlaying] = useState<{ idx: number; slow: boolean } | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const cats = useMemo(() => ['all', ...Array.from(new Set(VOCABULARY.map(w => w.category)))], []);

  const filtered = useMemo(() => {
    return VOCABULARY.filter(w => {
      if (cat !== 'all' && w.category !== cat) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      const { script, translation } = scriptAndTranslation(w, native, target);
      return script.toLowerCase().includes(s)
          || translation.toLowerCase().includes(s)
          || (target === 'zh' && w.pinyin.toLowerCase().includes(s));
    });
  }, [search, cat, native, target]);

  const play = async (row: VocabularyWord, idx: number, speed: AudioSpeed) => {
    const { audioField } = scriptAndTranslation(row, native, target);
    setPlaying({ idx, slow: speed === 'slow' });
    try {
      const src = await resolveAudioSource(row, audioField, speed, target);
      if (!src) { setPlaying(null); return; }
      if (!audioElRef.current) audioElRef.current = new Audio();
      if (src.kind === 'uri') {
        audioElRef.current.src = src.src;
      } else {
        audioElRef.current.src = URL.createObjectURL(new Blob([src.buffer], { type: 'audio/wav' }));
      }
      audioElRef.current.onended = () => setPlaying(null);
      await audioElRef.current.play();
    } catch (e) {
      console.error('Audio play failed', e);
      setPlaying(null);
    }
  };

  useEffect(() => () => { audioElRef.current?.pause(); audioElRef.current = null; }, []);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading title={t('vocab.title')} />

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg3)] pointer-events-none flex">
          <Search style={{ width: 18, height: 18 }} strokeWidth={1.75} />
        </span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('vocab.searchPh')}
          className="w-full box-border py-3.5 pl-11 pr-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--fg1)] text-sm shadow-sm outline-none focus:border-[var(--accent)]"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {cats.map(c => (
          <Pill key={c} active={cat === c} onClick={() => setCat(c)}>
            {c === 'all' ? t('vocab.cat.all') : c}
          </Pill>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((w, i) => {
          const { script, translation, pinyin, isCjk } = scriptAndTranslation(w, native, target);
          const isPlayingNormal = playing?.idx === i && !playing.slow;
          const isPlayingSlow   = playing?.idx === i &&  playing.slow;
          return (
            <Card key={`${w.hanzi}-${i}`} className="flex items-center justify-between gap-4" padding={24}>
              <div className="min-w-0">
                <div
                  className={isCjk ? 'chinese-text' : ''}
                  style={{
                    fontSize: isCjk ? 36 : 26,
                    fontWeight: isCjk ? 500 : 600,
                    color: 'var(--fg1)', lineHeight: 1.1, marginBottom: 10,
                    letterSpacing: isCjk ? 0 : '-0.01em', wordBreak: 'break-word',
                  }}
                >
                  {script}
                </div>
                {pinyin && <div className="pinyin text-base mb-0.5">{pinyin}</div>}
                <div className="text-[15px] text-[var(--fg2)]">{translation}</div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <IconButton
                  icon={isPlayingNormal ? Loader2 : Volume2}
                  tone="ink"
                  loading={isPlayingNormal}
                  onClick={() => play(w, i, 'normal')}
                  title={t('vocab.playNormal')}
                />
                <IconButton
                  icon={isPlayingSlow ? Loader2 : Snail}
                  tone="stone"
                  loading={isPlayingSlow}
                  onClick={() => play(w, i, 'slow')}
                  title={t('vocab.playSlow')}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card padding={48} className="text-center">
          <p className="m-0 text-[var(--fg2)]">{t('vocab.empty')}</p>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check + visual verify**

Run: `npm run lint`
Expected: PASS.

Run: `npm run dev:frontend`
Expected: vocab list shows the selected target-language script with the native-language translation. Audio buttons play via HF URI (if present) or fall back to Gemini TTS when `target` ∈ `{zh, en}`.

- [ ] **Step 3: Commit**

```bash
git add src/components/VocabularyList.tsx
git commit -m "refactor(vocab): port to new primitives, audioPlayer, and language pair"
```

---

### Task 26: Refactor `Flashcards.tsx`

**Files:**
- Modify: `src/components/Flashcards.tsx`

- [ ] **Step 1: Read the current file to preserve SRS logic**

Run: open `src/components/Flashcards.tsx` in the editor; note where state/SRS/rating buttons live.

- [ ] **Step 2: Refactor**

Preserve SRS + rating state. Swap the outer chrome and buttons to use `Card`, `IconButton`, `Pill`, `Eyebrow`, and `t()`. The card front uses the target-language script; the back shows the native-language translation and an example sentence if available. Audio button(s) use `resolveAudioSource(row, audioField, speed, target)`.

Key snippet for the card body and rating row:

```tsx
import Card from './ui/Card';
import IconButton from './ui/IconButton';
import Eyebrow from './ui/Eyebrow';
import { RotateCcw, AlertTriangle, Check, Zap, Volume2, Snail } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { VOCABULARY, type VocabularyWord } from '../data/vocabulary';
import { resolveAudioSource } from '../lib/audioPlayer';

// ... state + SRS from existing component ...

const { pair, t } = useLanguage();
const { native, target } = pair!;

// front face
<Card hero padding={40} className="flex items-center justify-center min-h-[320px]">
  <Eyebrow>{t('flash.flipPrompt')}</Eyebrow>
  <div
    className={target === 'zh' ? 'chinese-text' : ''}
    style={{ fontSize: target === 'zh' ? 128 : 72, fontWeight: 500, lineHeight: 1.1 }}
  >
    {/* same mapping as in VocabularyList */}
  </div>
</Card>

// rating row — four color-coded buttons using amber/rose/jade/lapis tokens
<div className="grid grid-cols-4 gap-3">
  <button className="rounded-2xl py-3 font-semibold text-white bg-[var(--color-rose)]">{t('flash.again')}</button>
  <button className="rounded-2xl py-3 font-semibold text-white bg-[var(--color-amber)]">{t('flash.hard')}</button>
  <button className="rounded-2xl py-3 font-semibold text-white bg-[var(--color-jade)]">{t('flash.good')}</button>
  <button className="rounded-2xl py-3 font-semibold text-white bg-[var(--color-lapis-info)]">{t('flash.easy')}</button>
</div>
```

Complete the file by merging the preserved SRS logic with the above primitives. Replace every hex literal with the corresponding CSS variable or Tailwind utility.

- [ ] **Step 3: Type-check + visual verify**

Run: `npm run lint`
Expected: PASS.

Run: `npm run dev:frontend` — step through the Flashcards tab, flip cards, rate them, verify audio plays.

- [ ] **Step 4: Commit**

```bash
git add src/components/Flashcards.tsx
git commit -m "refactor(flashcards): port to primitives + language pair + audioPlayer"
```

---

### Task 27: Refactor `GrammarHelper.tsx`

**Files:**
- Modify: `src/components/GrammarHelper.tsx`

- [ ] **Step 1: Rewrite**

```tsx
import { useState } from 'react';
import { Send, Loader2, BrainCircuit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Card from './ui/Card';
import HeroIconTile from './ui/HeroIconTile';
import SectionHeading from './ui/SectionHeading';
import { useLanguage } from '../context/LanguageContext';
import { explainGrammar } from '../lib/gemini';

export default function GrammarHelper() {
  const { pair, t } = useLanguage();
  const { native, target } = pair!;
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!query.trim()) return;
    setLoading(true); setAnswer(''); setError(null);
    try {
      const text = await explainGrammar(query.trim(), native, target);
      setAnswer(text);
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <HeroIconTile icon={BrainCircuit} color="var(--fg1)" tint="rgba(45,42,38,0.05)" />
        <SectionHeading title={t('grammar.title')} />
      </div>

      <Card hero padding={32}>
        <div className="flex gap-3 items-center">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder={t('grammar.prompt')}
            className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-5 py-3 text-base outline-none focus:border-[var(--accent)]"
            style={{ boxShadow: 'var(--shadow-inner)' }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="rounded-full px-5 py-3 text-white flex items-center gap-2"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} /> : <Send style={{ width: 18, height: 18 }} />}
          </button>
        </div>

        {loading && (
          <p className="mt-6 text-sm text-[var(--fg2)] flex items-center gap-2">
            <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
            {t('grammar.loading')}
          </p>
        )}

        {error && <p className="mt-6 text-sm text-[var(--color-rose)]">{error}</p>}

        {answer && (
          <div className="prose max-w-none mt-6">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + visual verify**

Run: `npm run lint`
Expected: PASS.

Run: `npm run dev:frontend` — ask a grammar question; confirm the answer arrives in the native language for the selected pair.

- [ ] **Step 3: Commit**

```bash
git add src/components/GrammarHelper.tsx
git commit -m "refactor(grammar): port to primitives + language pair"
```

---

### Task 28: Refactor `PronunciationChecker.tsx`

**Files:**
- Modify: `src/components/PronunciationChecker.tsx`

- [ ] **Step 1: Read current file for mic-record logic and rewrite the chrome**

Preserve the getUserMedia/MediaRecorder logic. Replace the UI with primitives; use the `HeroIconTile` in vermillion, `Card` hero with `Eyebrow` "HEDEF KELİME / TARGET WORD / 目标词", and `IconButton`-sized mic with a vermillion halo on active. Replace API call:

```tsx
import { evaluatePronunciation } from '../lib/gemini';
// ... inside the submit handler:
const result = await evaluatePronunciation(base64, mime, targetWord, pinyin, native, target);
```

And swap the target word display for the current target language (hanzi for `zh`, otherwise the plain word). The halo treatment while recording:

```tsx
<button
  className="rounded-full flex items-center justify-center"
  style={{
    width: 96, height: 96,
    background: 'var(--accent)', color: 'white',
    boxShadow: recording ? 'var(--halo-accent)' : 'var(--shadow-md)',
    transition: 'box-shadow 200ms ease-out',
  }}
>
  <Mic style={{ width: 40, height: 40 }} strokeWidth={1.75} />
</button>
```

Pronunciation is hidden when `target` is not a supported lang (`zh`/`en` in v1). Guard at the top of the component:

```tsx
if (target !== 'zh' && target !== 'en') {
  return (
    <Card padding={48} className="text-center">
      <p className="m-0 text-[var(--fg2)]">{t('picker.comingSoon')}</p>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check + verify**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/PronunciationChecker.tsx
git commit -m "refactor(pronunciation): port to primitives + language pair; gate on supported targets"
```

---

### Task 29: Refactor `LiveTutor.tsx`

**Files:**
- Modify: `src/components/LiveTutor.tsx`

- [ ] **Step 1: Rewrite, using the primitives + passing pair into `useLiveAPI`**

```tsx
import { MessageCircle, Phone } from 'lucide-react';
import Card from './ui/Card';
import HeroIconTile from './ui/HeroIconTile';
import SectionHeading from './ui/SectionHeading';
import { useLiveAPI } from '../hooks/useLiveAPI';
import { useLanguage } from '../context/LanguageContext';

export default function LiveTutor() {
  const { pair, t } = useLanguage();
  const { native, target } = pair!;
  const { connect, disconnect, isConnected, isConnecting, error } = useLiveAPI();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <HeroIconTile icon={MessageCircle} color="var(--color-jade)" tint="rgba(4,120,87,0.08)" />
        <SectionHeading title={t('live.title')} />
      </div>

      <Card hero padding={40} className="flex flex-col items-center gap-6 min-h-[360px] justify-center">
        {isConnected ? (
          <button
            type="button"
            onClick={disconnect}
            className="rounded-full text-white font-semibold px-8 py-4 flex items-center gap-3"
            style={{ background: 'var(--accent)', boxShadow: '0 4px 12px rgba(200,16,46,0.22)' }}
          >
            <Phone style={{ width: 18, height: 18 }} strokeWidth={1.75} />
            {t('live.endCall')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => connect({ native, target })}
            disabled={isConnecting}
            className="rounded-full text-white font-semibold px-8 py-4"
            style={{ background: 'var(--color-jade)', boxShadow: '0 4px 12px rgba(4,120,87,0.22)' }}
          >
            {isConnecting ? t('live.connecting') : t('live.connect')}
          </button>
        )}
        {error && <p className="m-0 text-sm text-[var(--color-rose)]">{error}</p>}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + manual test**

Run: `npm run lint`
Expected: PASS.

Run: `npm run dev` — start both frontend and AI backend. Switch to Canlı Pratik / Live Tutor, click connect, speak in the target language, confirm Gemini responds in target.

- [ ] **Step 3: Commit**

```bash
git add src/components/LiveTutor.tsx
git commit -m "refactor(live): port to primitives; pass language pair into useLiveAPI"
```

---

## Phase 7 — Cleanup

### Task 30: Remove `/api/save-audio`, `audioCache.ts`, and `/audio/*` static

**Files:**
- Delete: `src/lib/audioCache.ts`
- Modify: `server.ts`
- Modify: `src/lib/gemini.ts` (remove the deprecated stub)

- [ ] **Step 1: Delete `src/lib/audioCache.ts`**

```bash
rm src/lib/audioCache.ts
```

- [ ] **Step 2: Trim `server.ts`**

Remove these blocks:
- Lines setting up `audioDir`, `mkdirSync`, and `app.use("/audio", express.static(...))` + the 404 handler.
- The entire `app.post("/api/save-audio", ...)` block.

After these deletions, `server.ts` keeps: CORS, rate limiter, AI proxy (tts/grammar/transcribe/evaluate-pronunciation), WebSocket proxy, Vite dev middleware.

- [ ] **Step 3: Remove the deprecated `generateSpeech` stub from `src/lib/gemini.ts`**

Delete the `export const generateSpeech = ...` block entirely.

- [ ] **Step 4: Run lint + tests + boot**

Run:
```bash
npm run lint
npm test
npm run dev:frontend
```
Expected: all pass; app boots; nothing references `audioCache` or `/audio/*`.

- [ ] **Step 5: Commit**

```bash
git add server.ts src/lib/gemini.ts src/lib/audioCache.ts
git commit -m "chore: remove audioCache + /api/save-audio + /audio/* static route"
```

---

## Verification checklist (end-of-plan)

Run the full suite once the plan is complete:

- [ ] `npm test` — all Vitest tests pass (sync-vocab, i18n, audioPlayer)
- [ ] `npm run lint` — type-check clean
- [ ] `npm run build` — production bundle builds successfully
- [ ] Manual walkthrough: for each of the four v1 pairs (`tr→zh`, `en→zh`, `zh→en`, `tr→en`):
  - Vocab list shows correct script + translation, audio plays (URI or Gemini fallback)
  - Flashcards flip, rate, advance, audio plays on front face
  - Grammar answers arrive in native language
  - Pronunciation (zh/en targets only): records, scores, feedback in native language
  - Live Tutor connects, speaks target language, corrects in target, responds gently
- [ ] Reset picker: click language pill → picker re-opens → pick new pair → app re-initializes
- [ ] Turkish-target pairs (`zh→tr`, `en→tr`) render disabled with "Yakında/Coming soon/即将推出" in step 2
