# Van Every Social Post Webapp

## 2. Project Overview

Frontend webapp for Van Every Family Chiropractic Center's social media posting pipeline. Built with Next.js 14 + TypeScript + Tailwind CSS, exported as a static site. Provides a drag-and-drop interface for uploading images or videos, previewing AI-generated text overlays and per-platform captions, editing them inline, and submitting posts to 7 social platforms (Facebook, Instagram, LinkedIn, Pinterest, TikTok, Twitter/X, YouTube). Communicates with the ImageAutomation backend API (separate repo at `~/Code/Social-Media-Automation/ImageAutomation-ClaudeCode`) via fetch calls. The backend handles AI caption generation, image processing, video processing, and posting to social platforms.

## 3. Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router, `'use client'`) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 3.4 + custom CSS (`globals.css`) |
| HEIC Support | `heic2any` (client-side HEIC-to-JPEG conversion for thumbnails) |
| Build | Static export (`output: 'export'` in `next.config.mjs`) |
| Deployment | Static files bundled into Modal backend via `sync-webapp.sh`, or Vercel |
| API Communication | Fetch API via `lib/api.ts` (same-origin or configurable base URL) |
| Job Persistence | localStorage (client-side, up to 20 recent jobs) |

## 4. Architecture

```
src/app/page.tsx (main orchestrator -- ALL state lives here)
  |-- components/UploadZone.tsx      # Dual image/video dropzones with file input fallbacks
  |-- components/MediaThumbnails.tsx  # Drag-to-reorder thumbnails, HEIC conversion, order badges
  |-- components/Toggle.tsx          # Reusable toggle switch (multi-post, overlay, special video)
  |-- components/PlatformSelector.tsx # Platform checkboxes for video mode
  |-- components/PreviewSection.tsx   # Image/video preview + caption/overlay editors + actions
  |-- components/OverlayEditor.tsx    # Text overlay inputs per image + font size control
  |-- components/CaptionEditor.tsx    # Per-platform caption textareas with char limits
  |-- components/FontSizeControl.tsx  # Auto/manual font size slider (100-300px)
  |-- components/JobStatus.tsx        # Job polling (5s interval) with platform results display
  |-- components/RecentJobs.tsx       # localStorage job history list
  |-- components/ConfirmDialog.tsx    # Custom confirm modal (replaces browser confirm())

lib/api.ts       # All backend API calls + video upload cascade
lib/constants.ts # Platform char limits, loading step messages, platform lists
lib/types.ts     # TypeScript interfaces for all API responses and state
lib/jobs.ts      # localStorage job CRUD with 30-min stale auto-fail
```

### Data Flow

```
Upload Phase:
  User drops files -> page.tsx state -> MediaThumbnails renders previews

Process Phase (images):
  page.tsx -> api.processImages() -> Backend generates overlay text + previews
  Backend returns: overlay_texts[], preview_images[], platform_captions{}

Process Phase (video):
  page.tsx -> api.processVideo() -> Direct upload to backend (primary)
                                 -> Upload cascade: litterbox -> catbox -> proxy (fallback)
  Backend returns: video_url, thumbnail_url, title, platform_captions{}

Preview Phase:
  User edits overlay text, font size, per-platform captions
  User clicks Re-Generate -> api.regeneratePreview() -> updated preview images

Post Phase:
  User confirms -> api.submitImageJob() or api.submitVideoJob()
  Backend returns job_id -> JobStatus polls api.fetchJobStatus() every 5s
  Results show per-platform success/failure with error details
```

### Video Upload Cascade

Videos use a 3-tier upload cascade with retry logic in `lib/api.ts`:
1. **Direct to backend** (primary) -- multipart form upload, backend handles temp hosting
2. **Litterbox** (1GB limit, 1h expiry) -- client-side upload, URL sent to backend
3. **Catbox** (200MB limit, permanent) -- client-side fallback
4. **Backend proxy** -- streams to litterbox server-side, bypasses CORS

Each tier gets 2 retry attempts with exponential backoff before falling through.

### Key Design Patterns

- **Page-level state** -- all state in `page.tsx`, passed as props to components, callbacks up
- **Static export** -- `next build` produces static HTML/JS/CSS in `out/` for Modal or Vercel
- **Same-origin API** -- `NEXT_PUBLIC_API_BASE_URL` env var (empty = same origin in production)
- **Fire-and-forget jobs** -- posts submitted, then polled via job ID until done/failed
- **localStorage persistence** -- recent jobs stored client-side, auto-marked failed after 30 minutes stale
- **Drag-to-reorder** -- HTML5 drag API in MediaThumbnails for image/video ordering
- **Custom confirm dialog** -- replaces browser `confirm()` for consistent cross-platform UX
- **Multi-post mode** -- each image/video gets individual captions, posted on schedule (N hours apart)
- **Special video mode** -- YouTube-only unlisted posting for office tour videos

## 5. Directory Structure

```
.
|-- .claude/
|   +-- CLAUDE.md           # This file
|-- public/
|   +-- logo.png            # Van Every logo (2.7MB PNG)
|-- src/
|   |-- app/
|   |   |-- layout.tsx      # Root layout (metadata only)
|   |   |-- page.tsx        # Main page (state orchestrator, 637 lines)
|   |   +-- globals.css     # Tailwind base + 650 lines custom branded CSS
|   |-- components/         # 11 React components
|   |   |-- CaptionEditor.tsx     # Per-platform + multi-image caption editing
|   |   |-- ConfirmDialog.tsx     # Modal confirm dialog
|   |   |-- FontSizeControl.tsx   # Auto/manual font size slider
|   |   |-- JobStatus.tsx         # Job polling + results display
|   |   |-- MediaThumbnails.tsx   # Drag-reorder thumbnails, HEIC support
|   |   |-- OverlayEditor.tsx     # Text overlay inputs + font control
|   |   |-- PlatformSelector.tsx  # Video platform checkboxes
|   |   |-- PreviewSection.tsx    # Preview layout + actions
|   |   |-- RecentJobs.tsx        # Job history from localStorage
|   |   |-- Toggle.tsx            # Reusable toggle switch
|   |   +-- UploadZone.tsx        # Dual image/video dropzones
|   +-- lib/
|       |-- api.ts           # Backend API client (390 lines, upload cascade)
|       |-- constants.ts     # Platform limits, loading messages
|       |-- jobs.ts          # localStorage job CRUD
|       +-- types.ts         # TypeScript interfaces
|-- out/                     # Static export output (gitignored)
|-- next.config.mjs          # Static export + unoptimized images
|-- tailwind.config.ts       # Brand colors (pink, cream, charcoal)
|-- tsconfig.json            # Strict mode, path alias @/*
|-- postcss.config.mjs
|-- package.json
+-- .gitignore
```

## 6. Development Conventions

- **Framework**: Next.js 14 App Router with `'use client'` directive on all interactive components (entire app is client-side)
- **Language**: TypeScript strict mode, all shared types in `lib/types.ts`
- **Styling**: Mix of Tailwind utility classes (inline) + custom CSS in `globals.css` for complex branded elements (dropzones, toggles, cards, spinners). Brand colors defined in `tailwind.config.ts` as `brand-pink`, `brand-pink-dark`, `brand-cream`, `brand-charcoal`.
- **State management**: All state lives in `page.tsx` via `useState` hooks. Props flow down, callbacks flow up. No external state library.
- **Naming**: PascalCase for components, camelCase for functions/variables/hooks, UPPER_SNAKE for constants
- **API calls**: All through `lib/api.ts` -- never direct `fetch` in components
- **Images**: `<img>` tags used instead of `next/image` because preview images are base64 data URLs from the API
- **Error handling**: `fetchWithTimeout` wrapper with configurable timeouts, `safeJson` for response parsing, retry logic with exponential backoff on upload cascade
- **File organization**: One component per file, lib/ for shared utilities/types/constants

## 7. Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL (empty string = same origin) | No (defaults to same origin) |

No secrets are stored in the frontend. The backend (ImageAutomation-ClaudeCode) handles all API keys for social platforms.

## 8. Workflow

```bash
# Local development (hot reload on port 3000)
npm run dev

# Build static export
npm run build
# Output goes to out/ directory

# Lint check
npm run lint

# Deploy to Modal (primary deployment path)
cd ~/Code/Social-Media-Automation/ImageAutomation-ClaudeCode
./scripts/sync-webapp.sh   # Builds Next.js + copies out/ to webapp/
./deploy.sh                 # Deploys to Modal

# Deploy to Vercel (alternative)
# Push to GitHub, Vercel auto-deploys from main branch

# Full deployment checklist:
# 1. npm run lint          -- catch TypeScript/ESLint errors
# 2. npm run build         -- verify static export succeeds
# 3. Test locally          -- open out/index.html or npm run dev
# 4. Sync + deploy         -- sync-webapp.sh + deploy.sh
```

### Related Repos

| Repo | Path | Relationship |
|------|------|-------------|
| ImageAutomation-ClaudeCode | `~/Code/Social-Media-Automation/ImageAutomation-ClaudeCode` | Backend API (Python/Modal) -- handles AI, image processing, posting |
| VideoAutomation-ClaudeCode | `~/Code/Social-Media-Automation/VideoAutomation-ClaudeCode` | Video processing backend |
| Social-Media-Scaling | `~/Code/Social-Media-Automation/Social-Media-Scaling` | Scaling strategy docs |

## 9. Known Issues

1. **No offline support** -- requires backend API to function; no service worker or local fallback
2. **Large video uploads may timeout** -- direct uploads over ~500MB can fail on slow connections; cascade to litterbox/catbox provides fallback but adds latency
3. **localStorage job limit** -- history capped at 20 entries; older jobs silently dropped
4. **`<img>` tags for data URLs** -- cannot use `next/image` for base64 data URLs returned by the API; images are unoptimized
5. **iOS Safari HEIC handling** -- HEIC thumbnails are converted client-side via `heic2any` library; conversion can be slow for many images; if conversion fails, falls back to raw object URL (may work natively on Safari only)
6. **Stale job auto-fail** -- jobs stuck in pending/processing for >30 minutes are auto-marked as failed in localStorage; the backend job may still be running
7. **No job cancellation** -- once a job is submitted, it cannot be cancelled from the frontend
8. **Logo file size** -- `public/logo.png` is 2.7MB; should be optimized/compressed

## 10. Security

- No secrets stored in frontend code -- all API keys live in the backend
- All API calls to same-origin backend in production (no CORS issues)
- `NEXT_PUBLIC_` prefix is safe -- this env var contains only a URL, never credentials
- React's JSX escaping prevents XSS by default
- Video upload cascade sends files to third-party hosts (litterbox.catbox.moe, catbox.moe) only as fallback -- these are temporary file hosts; no sensitive data is uploaded
- localStorage stores only job IDs and descriptions (no PII, no credentials)

## 11. Subagent Orchestration

| Agent | When to Use |
|-------|-------------|
| `frontend` | Adding new React components, modifying Tailwind styles, or refactoring the component tree |
| `browser-navigator` | Testing drag-and-drop UI, verifying preview rendering, checking mobile responsiveness |
| `pre-push-validator` | Before pushing -- lint, type-check, build verification |
| `codebase-explorer` | Before modifying page.tsx state management -- understand how state flows to all 11 components |

## 12. GSD + Teams Strategy

**Project complexity:** Low -- single Next.js static export webapp with no backend logic, no database, no server-side code. Work is typically small, sequential, and self-contained within this repo.

**GSD usage:** Not actively used for this project. Changes are usually incremental UI improvements or component additions that do not require multi-phase planning. For larger refactors (e.g., adding a new workflow section or redesigning the upload flow), a single GSD phase may be appropriate.

**Agent Teams usage:** Not needed for this project's scope. All state lives in `page.tsx` and data flows strictly downward -- there are no parallel-safe modules large enough to warrant splitting across teammates.

| Scenario | Approach | Why |
|----------|----------|-----|
| Add new component | Main agent (sequential) | Must wire state in page.tsx, props coupling |
| Style/CSS changes | Main agent | Small surface area, globals.css is shared |
| API client changes | Main agent | `lib/api.ts` is shared by all components |
| Full UI redesign | Consider GSD (1 phase) | Multiple components + globals.css + page.tsx |
| New media type support | GSD (2-3 phases) | Types + API + components + page.tsx wiring |

**Context management:**
- `page.tsx` is the coupling point -- all 20+ state variables live here; any component change likely touches this file
- `lib/api.ts` is shared -- avoid parallel edits
- `globals.css` has 650+ lines of custom CSS -- changes here affect all components
- Use `/gsd:resume-work` if resuming multi-session work

## 13. MCP Connections

None -- this is a static frontend with no server-side code. The backend (ImageAutomation-ClaudeCode) handles all external integrations (social platform APIs, AI services, file hosting).

## 14. Completed Work

- **Initial extraction (2026-02-19)**: Extracted frontend from ImageAutomation monolith into standalone repo
- **Next.js conversion (2026-02-19)**: Converted from vanilla HTML/CSS/JS (1,157-line `app.js`) to Next.js 14 + TypeScript + Tailwind CSS
  - 11 React components with full TypeScript types
  - API client layer in `lib/api.ts` with timeout and retry logic
  - Custom confirm dialog replacing browser `confirm()`
  - Static export working for Modal bundle deployment
  - `sync-webapp.sh` updated to build Next.js and copy output
- **Font size controls (2026-02)**: 100-300px range slider with auto mode, inline preview regeneration
- **Video upload hardening (2026-02)**: Redundant upload cascade (litterbox, catbox, backend proxy), iOS size checks, better error messages
- **API resilience (2026-02)**: Fetch timeouts, safe JSON parsing, poll failure tolerance (3 retries before giving up)
- **Direct video upload (2026-02)**: Restored direct multipart upload to backend as primary path, cascade as fallback
- **HEIC support (2026-03)**: Client-side HEIC-to-JPEG thumbnail conversion via `heic2any`, placeholder for unsupported formats
- **Stale job handling (2026-03)**: Auto-mark processing jobs as failed after 30 minutes in localStorage

## Brand

- Pink: `#e09f9f` (primary accent, buttons, borders, highlights)
- Pink Dark: `#c77e7e` (hover states)
- Cream: `#fdfbf7` (background)
- Charcoal: `#2d2d2d` (text)
- Max app width: 640px (mobile-first, single column)
