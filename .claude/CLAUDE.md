# Van Every Social Post Webapp

## Workflow Rules
- **ALWAYS pull before working**: Run `git pull --rebase` before making any changes. This is mandatory for multi-machine sync.
- **ALWAYS commit and push after making changes.** After completing ANY code changes, immediately stage modified files by name, commit with a descriptive message, and push. Every change must end with a successful `git push`.
- **Never leave files behind.** Before ending any session, run `git status` and confirm zero untracked or modified files.
- Never use `git add .` or `git add -A` — always add specific files by name.
- Commit message format: conventional commits (feat:, fix:, chore:, docs:). Always include `Co-Authored-By: Claude <noreply@anthropic.com>`.

## 1. Project Overview

Frontend webapp for Van Every Family Chiropractic Center's social media posting pipeline. Built with Next.js 14 + TypeScript + Tailwind CSS. Provides a drag-and-drop interface for uploading images/video, previewing AI-generated text overlays and captions, editing per-platform captions, and submitting posts to 7 social platforms. Communicates with the ImageAutomation backend API via fetch calls.

## 2. Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + custom CSS (globals.css) |
| Build | Static export (`output: 'export'`) |
| Deployment | Bundled into Modal backend via sync script, or Vercel |
| API communication | Fetch API via `lib/api.ts` |

## 3. Architecture

```
src/app/page.tsx (main orchestrator — all state lives here)
  ├── components/UploadZone.tsx      # Image/video dropzones
  ├── components/MediaThumbnails.tsx  # Drag-to-reorder thumbnails
  ├── components/Toggle.tsx          # Reusable toggle switch
  ├── components/PlatformSelector.tsx # Platform checkboxes (video mode)
  ├── components/PreviewSection.tsx   # Image/video preview + editors
  ├── components/OverlayEditor.tsx    # Text overlay inputs + font size
  ├── components/CaptionEditor.tsx    # Per-platform caption textareas
  ├── components/FontSizeControl.tsx  # Auto/manual font size slider
  ├── components/JobStatus.tsx        # Job polling with results
  ├── components/RecentJobs.tsx       # localStorage job history
  └── components/ConfirmDialog.tsx    # Custom confirm modal

lib/api.ts       # All backend API calls
lib/constants.ts # Platform limits, loading steps
lib/types.ts     # TypeScript interfaces
lib/jobs.ts      # localStorage job management

Data flow:
  Browser → api.processImages() → Backend generates previews
  Browser → api.submitImageJob() → Backend posts to platforms (fire-and-forget)
  Browser ← api.fetchJobStatus() ← Backend returns job status (polled every 5s)
```

### Key Design Patterns

- **Page-level state** — all state in `page.tsx`, passed as props to components
- **Static export** — `next build` produces static HTML/JS/CSS for Modal or Vercel
- **Same-origin API** — `NEXT_PUBLIC_API_BASE_URL` env var (empty = same origin)
- **Fire-and-forget jobs** — posts submitted then polled via job ID
- **localStorage** — recent jobs stored client-side
- **Drag-to-reorder** — HTML5 drag API in MediaThumbnails
- **Custom confirm dialog** — replaces browser `confirm()` for better UX

## 4. Directory Structure

```
.
├── .claude/
│   └── CLAUDE.md           # This file
├── public/
│   └── logo.png            # Van Every logo
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout (metadata)
│   │   ├── page.tsx        # Main page (state orchestrator)
│   │   └── globals.css     # Tailwind + custom styles
│   ├── components/
│   │   ├── CaptionEditor.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── FontSizeControl.tsx
│   │   ├── JobStatus.tsx
│   │   ├── MediaThumbnails.tsx
│   │   ├── OverlayEditor.tsx
│   │   ├── PlatformSelector.tsx
│   │   ├── PreviewSection.tsx
│   │   ├── RecentJobs.tsx
│   │   ├── Toggle.tsx
│   │   └── UploadZone.tsx
│   └── lib/
│       ├── api.ts          # Backend API client
│       ├── constants.ts    # Platform limits, loading steps
│       ├── jobs.ts         # localStorage job management
│       └── types.ts        # TypeScript interfaces
├── next.config.mjs         # Static export config
├── tailwind.config.ts      # Brand colors
├── tsconfig.json
├── postcss.config.mjs
├── package.json
└── .gitignore
```

## 5. Development Conventions

- **Framework**: Next.js 14 App Router with `'use client'` directive on interactive components
- **Language**: TypeScript strict mode
- **Styling**: Tailwind utility classes + custom CSS in globals.css for complex branded elements
- **State**: useState at page level, props down to components, callbacks up
- **Naming**: PascalCase for components, camelCase for functions/variables
- **API calls**: All through `lib/api.ts`, never direct fetch in components
- **Types**: All shared types in `lib/types.ts`

## 6. Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend URL (empty = same origin) |

## 7. Workflow

```bash
# Local development (hot reload)
npm run dev

# Build static export
npm run build
# Output in out/ directory

# Sync to backend for Modal deployment
cd ~/Code/Social-Media-Automation/ImageAutomation-ClaudeCode
./scripts/sync-webapp.sh   # builds Next.js + copies out/ to webapp/
./deploy.sh                 # deploys to Modal

# Deploy to Vercel (alternative)
# Push to GitHub, Vercel auto-deploys
```

## 8. Known Issues

- No offline support — requires backend API to function
- Large file uploads may time out on slow connections
- localStorage job history limited to 20 entries
- `<img>` tags used instead of `next/image` for base64 data URLs from API

## 9. Security

- No secrets stored in frontend code
- All API calls to same-origin backend (no CORS issues in production)
- React's JSX escaping prevents XSS by default
- Environment variables prefixed with `NEXT_PUBLIC_` are safe (no secrets)

## 10. Subagent Orchestration

| Agent | When to Use |
|-------|-------------|
| `browser-navigator` | Test drag-and-drop UI, verify preview rendering |
| `frontend` | Adding new React components or modifying Tailwind styles |
| `pre-push-validator` | Before pushing — lint, type-check, build verification |

## 11. GSD + Teams Strategy

**Project complexity:** Low — single Next.js static export webapp with no backend logic. Work is typically small, sequential, and self-contained within this repo.

**GSD usage:** GSD is not actively used for this project. Changes are usually incremental UI improvements or component additions that do not require multi-phase planning. For larger refactors (e.g., adding a new workflow section), a single GSD phase may be appropriate.

**Agent Teams usage:** Not needed for this project's scope. All state lives in `page.tsx` and data flows strictly downward — there are no parallel-safe modules large enough to warrant splitting across teammates.

| Phase | Work | Team Approach |
|-------|------|---------------|
| Add new component | New React component + wiring to page.tsx | Main agent (sequential state coupling) |
| Style/Tailwind changes | Tailwind utility class updates | Main agent |
| API client changes | Modify `lib/api.ts` | Main agent (shared by all components) |
| Full UI redesign | Multiple components + globals.css | Main agent (small surface area) |

**Context management:**
- `page.tsx` is the coupling point — all state lives here; any teammate touching components also needs this file
- `lib/api.ts` is shared — avoid parallel edits
- Use `/gsd:resume-work` if resuming multi-session work

## 12. MCP Connections

None — this is a static frontend. Backend handles all external integrations.

## 12. Completed Work

- Extracted from ImageAutomation monolith (2026-02-19)
- **Next.js conversion (2026-02-19)**: Converted from vanilla HTML/CSS/JS to Next.js 14 + TypeScript + Tailwind
  - 11 React components ported from 1,157-line app.js
  - Full TypeScript types for all API responses
  - API client layer in lib/api.ts
  - Custom confirm dialog replacing browser confirm()
  - Static export working for Modal bundle deployment
  - sync-webapp.sh updated to build Next.js and copy output

## Brand

- Pink: `#e09f9f`
- Cream: `#fdfbf7`
- Charcoal: `#2d2d2d`
