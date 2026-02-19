# Van Every Social Post Webapp

## 1. Project Overview

Frontend webapp for Van Every Family Chiropractic Center's social media posting pipeline. Provides a drag-and-drop interface for uploading images/video, previewing AI-generated text overlays and captions, editing per-platform captions, and submitting posts to 7 social platforms. Communicates with the ImageAutomation backend API via fetch calls.

## 2. Tech Stack

| Component | Technology |
|-----------|------------|
| Markup | Vanilla HTML5 |
| Styling | Vanilla CSS3 (no framework) |
| Logic | Vanilla JavaScript (ES6+, no build step) |
| Deployment | Bundled into Modal backend via sync script |
| API communication | Fetch API to same-origin backend |

## 3. Architecture

```
index.html
  ├── css/styles.css (all styles, ~700 lines)
  ├── js/config.js   (API_BASE_URL + PLATFORM_LIMITS)
  └── js/app.js      (all UI logic, ~1170 lines)

Data flow:
  Browser → fetch(API_BASE_URL + '/process') → Backend generates previews
  Browser → fetch(API_BASE_URL + '/submit-job') → Backend posts to platforms
  Browser ← poll fetch('/job/{id}') ← Backend returns job status
```

### Key Design Patterns

- **No build tools** — vanilla HTML/CSS/JS, no bundler or transpiler
- **Same-origin API** — `API_BASE_URL = ""` by default (served alongside backend)
- **Fire-and-forget jobs** — posts are submitted, then polled via job ID
- **localStorage** — recent jobs stored client-side for quick status checks
- **Drag-to-reorder** — images/videos can be reordered before submission

## 4. Directory Structure

```
.
├── .claude/
│   └── CLAUDE.md         # This file
├── assets/
│   └── logo.png          # Van Every logo
├── css/
│   └── styles.css        # All styles
├── js/
│   ├── config.js         # API_BASE_URL + PLATFORM_LIMITS
│   └── app.js            # All UI logic
├── index.html            # Main entry point
├── .gitignore
└── README.md
```

## 5. Development Conventions

- **No build step** — edit files directly, refresh browser to test
- **Naming**: kebab-case for CSS classes, camelCase for JS variables
- **Config**: All configurable values in `js/config.js`
- **API calls**: All fetch URLs prefixed with `API_BASE_URL` from config.js

## 6. Environment Variables

None. Configuration is in `js/config.js`:
- `API_BASE_URL` — backend URL (empty string = same origin)
- `PLATFORM_LIMITS` — character limits per social platform

## 7. Workflow

```bash
# Local development — open directly in browser
open index.html

# Or serve with a simple HTTP server
python3 -m http.server 8080

# Sync to backend for deployment
cd ~/Code/ImageAutomation-ClaudeCode
./scripts/sync-webapp.sh

# Deploy via backend
./deploy.sh
```

## 8. Known Issues

- No offline support — requires backend API to function
- Large file uploads may time out on slow connections
- localStorage job history limited to 20 entries

## 9. Security

- No secrets stored in frontend code
- All API calls are to same-origin backend (no CORS issues in production)
- User input is not directly injected into DOM without escaping

## 10. Subagent Orchestration

| Agent | When to Use |
|-------|-------------|
| `browser-navigator` | Test the drag-and-drop UI, verify preview rendering |
| `frontend` | When adding new UI features or refactoring CSS/JS |

## 11. MCP Connections

None — this is a static frontend. Backend handles all external integrations.

## 12. Completed Work

- Extracted from ImageAutomation monolith (image_app.py lines 65-2122)
- Split into clean CSS/HTML/JS files with external references
- Created js/config.js with API_BASE_URL for future cross-origin support
- All fetch() calls updated to use API_BASE_URL prefix

## Brand

- Pink: `#e09f9f`
- Cream: `#fdfbf7`
- Charcoal: `#2d2d2d`
