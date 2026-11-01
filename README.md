# Utsav - GenAI Celebration & Event Planner

> **"Confetti & Ink"** — A culture-aware, living celebration and event planner powered by Google Gemini (`gemini-2.5-flash`), React 19, and Tailwind CSS.

---

## Table of Contents
- [What is Utsav?](#what-is-utsav)
- [Screenshots](#screenshots)
- [Key Features](#key-features)
- [Architecture Diagram](#architecture-diagram)
- [Tech Stack](#tech-stack)
- [How Gemini is Used](#how-gemini-is-used)
- [Getting Started & Setup](#getting-started--setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Security & Hardening](#security--hardening)
- [Accessibility (WCAG 2.1 AA)](#accessibility-wcag-21-aa)
- [Docker Deployment](#docker-deployment)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## What is Utsav?

**Utsav** (उत्सव, *celebration*) turns a single natural-language sentence into a comprehensive, culturally rich, and mathematically balanced event blueprint in seconds. 

Whether planning a traditional multi-day Indian wedding with Sangeet and Haldi ceremonies, a 150-guest milestone anniversary, a residential society (RWA) Diwali festival requiring municipal and sound permits, or a college fest, Utsav generates:
1. **Intelligent Budget Allocation** with proportional recalculation, lockable categories, and exact 100% sum guarantees.
2. **Reverse Milestone Timelines** from T-90 days down to Day-of (T-0), tracking task ownership and overdue statuses.
3. **Vendor Vetting Guides** tailored to city tiers with realistic price ranges, red flags, crucial vetting questions, and copyable outreach templates.
4. **Curated Celebration Inspirations** including themes, regional menus, decor concepts, entertainment, and copy-paste WhatsApp RSVP templates.
5. **Living Re-Planning Engine** that recalculates the plan when constraints change ("add 50 guests", "reduce budget by ₹1L", "make it eco-friendly") while highlighting exactly what changed with visual diff chips.
6. **Risk Radar** with likelihood-impact mapping, mitigations, backup plans, and timeline actions.
7. **Guest management** with RSVP statuses, dietary summaries, CSV import/export, and headcount-linked re-planning.
8. **Sharing and integrations** with privacy-safe compressed links, print/PDF output, Google Calendar, Google Maps, WhatsApp, and multilingual generated content.

---

## Screenshots

| Desktop Celebration Plan Dashboard | Version History & Living Diff Viewer |
| :---: | :---: |
| ![Utsav Main Dashboard](https://placehold.co/800x450/3B1F4A/FFF8EE?text=Utsav+Celebration+Plan+Dashboard) | ![Utsav Version History](https://placehold.co/800x450/23152C/F5A623?text=Version+History+%26+Living+Diffs) |

| Budget Donut & Accessible Table | Culture-Aware Vendor Vetting Kit |
| :---: | :---: |
| ![Utsav Budget Tab](https://placehold.co/800x450/FFF8EE/3B1F4A?text=Lockable+Budget+%26+Donut+Chart) | ![Utsav Vendors Tab](https://placehold.co/800x450/3B1F4A/F5A623?text=Vendor+Directories+%26+Outreach) |

---

## Key Features

- **Single-Sentence Intake**: Describe your celebration via text or voice input (using the Web Speech API). Utsav extracts event type, date, guests, budget, city, and theme. If critical details are missing, it asks one clarifying question while continuing with sensible defaults.
- **Dynamic Lockable Budget**: Donut chart with category locks. Toggle a lock to freeze a category's rupee amount while adjusting the total budget slider or testing "What if -20%?". Unlocked categories redistribute proportionally, with 100% sum enforced in code.
- **Reverse Milestone Timeline**: Chronological tasks ordered backward from the event date (T-90, T-60, T-30, T-15, T-7, T-0), flagging overdue tasks in red and supporting quick completion toggles.
- **Vendor Negotiation Kits**: Pricing brackets categorized by tier-1 and tier-2 Indian cities, accompanied by specific vetting questions, vendor red flags, and ready-to-send outreach messages.
- **Cultural Intelligence**: Distinct modules for multi-day weddings (Haldi, Mehendi, Sangeet choreography), community RWA festivals (permissions, volunteer rosters, sound curfews), and personal milestones.
- **Signature Living Re-Planner**: Free-text change console computing explicit diffs (+₹12,000, moved to T-45, task added) with animated diff chips.
- **Snapshot History**: In-browser version snapshots with instant restore, undo/redo, and JSON export/import.
- **Theme "Confetti & Ink"**: Warm cream (`#FFF8EE`), royal plum (`#3B1F4A`), and marigold (`#F5A623`) with full dark mode support (`#180D1F`) and celebration confetti bursts.

---

## Architecture Diagram

```mermaid
graph TD
    User([User]) -->|Natural Language Brief / Voice| UI[React 19 SPA Frontend]
    UI -->|Skip Links / WAI-ARIA / Live Regions| A11y[WCAG 2.1 AA Layer]
    UI -->|Zod Validated Payloads| API[/api/plan & /api/replan]
    
    subgraph Express Backend
        API --> Security[Helmet + Rate Limiting 30 req/15min + 100kb Cap]
        Security --> Sanitizer[Prompt Sanitizer & Injection Filter]
        Sanitizer --> GeminiClient[Gemini Client /gemini-2.5-flash]
        
        GeminiClient -->|Structured JSON via responseSchema| LLM[(Google GenAI API)]
        LLM -->|Candidate JSON Plan| Validator[Zod Schema Validator]
        
        Validator -->|Valid Plan| Response[Return Source: gemini]
        Validator -->|Schema Failure / Timeout| Fallback[server/fallback.ts Engine]
        Fallback -->|Deterministic Fallback Plan| ResponseFallback[Return Source: fallback-timeout / fallback-error]
    end

    Response --> UI
    ResponseFallback --> UI
    UI --> DiffEngine[Client Diff Computation & History Snapshots]
    UI --> LocalStorage[(Client LocalStorage)]
```

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React icons, Canvas Confetti.
- **Backend**: Node.js 22, Express 4, `@google/genai` TypeScript SDK, Helmet, `express-rate-limit`, `tsx`.
- **Validation**: Zod 4 for end-to-end type safety and schema validation.
- **Testing**: Vitest 5, `@testing-library/react`, `supertest`, `vitest-axe`, `axe-core`, `jsdom`.
- **Deployment**: Multi-stage Docker container (`node:22-alpine`) with non-root security.

---

## How Gemini is Used

Utsav uses **Gemini 2.5 Flash** (`gemini-2.5-flash`) via the modern `@google/genai` SDK:
1. **Structured Outputs (`responseSchema`)**: Enforces strict JSON schemas directly in the model call without requiring post-hoc parsing heuristics or markdown stripping.
2. **Thinking Configuration**: Leverages low thinking level (`ThinkingLevel.LOW`) for fast planning latency while retaining nuanced cultural and geographical context.
3. **Delimiter-Isolated Prompts**: User briefs and re-plan instructions are sanitized and enclosed within unambiguous boundary markers (`<<<USER_EVENT_BRIEF>>>` and `<<<USER_CHANGE_INSTRUCTION>>>`).
4. **Resilient Retry & Fallback**: If Gemini times out (configurable via `GEMINI_TIMEOUT_MS`) or returns invalid JSON, the server automatically retries once before gracefully degrading to the deterministic rule-based parser in `server/fallback.ts`. The response explicitly flags its origin (`gemini`, `fallback-timeout`, `fallback-error`, or `fallback-nokey`).

---

## Getting Started & Setup

### Prerequisites
- Node.js 22+
- npm 10+
- Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/))

### 1. Clone & Install
```bash
git clone <repository-url>
cd utsav
npm install
```

### 2. Configure Environment
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Edit `.env`:
```env
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build and Run Production
```bash
npm run build
npm start
```

---

## Environment Variables

| Variable | Description | Default | Required? |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API key | None | Yes (falls back to offline parser without key) |
| `GEMINI_MODEL` | Gemini model identifier | `gemini-2.5-flash` | No |
| `GEMINI_TIMEOUT_MS` | Gemini request timeout in milliseconds | `25000` (25s) | No |
| `PORT` | HTTP server port | `3000` | No |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` | No |

---

## Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts development server with Vite hot middleware on port 3000 |
| `npm run build` | Compiles client assets into production bundle in `dist/` |
| `npm start` | Launches production server serving API and static assets from `dist/` |
| `npm run lint` | Runs TypeScript compiler checks (`tsc --noEmit`) |
| `npm test` | Executes all Vitest test suites (unit, API, and accessibility) |
| `npm run test:watch` | Starts Vitest interactive test watcher |
| `npm run clean` | Cleans build artifacts (`dist/`) |
| `npm run preview` | Previews production build using Vite preview |

---

## Testing

Utsav includes 62 comprehensive tests across unit logic, server endpoints, component interactions, sharing/privacy behavior, and automated accessibility verification:

```bash
# Run all tests
npm test
```

### Test Suites:
1. **Accessibility (`test/accessibility.test.tsx`)**: Automated WCAG 2.1 AA audits via `vitest-axe` covering `App`, `BudgetTab`, `TimelineTab`, `VendorsTab`, `IdeasTab`, `DonutChart` (chart & table views), `HistoryDrawer`, `StatusBanner`, and input forms.
2. **Server API (`server/api.test.ts`)**: Supertest integration tests verifying 200 responses, schema validation, 400 error codes on malformed/lengthy payloads, Gemini timeouts, and `/api/health`.
3. **Fallback & Brief Parsing (`server/fallback.test.ts`, `src/utils/briefParser.test.ts`)**: Regex parsing of complex Indian currency formats (`₹6L`, `1.5 Lakh`, `50k`, `2 Cr`), guest counts, cities, and safe regex replanning.
4. **Pure Logic & Budget Normalization (`src/utils/planLogic.test.ts`)**: Lock retention, proportional redistribution, exact 100% sum guarantees, and diff detection.
5. **Component Interaction (`src/components/BudgetTab.test.tsx`)**: Slider adjustments and lock toggles.

---

## Security & Hardening

1. **Helmet HTTP Headers**: Configured with security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-DNS-Prefetch-Control`).
2. **IP Rate Limiting**: All `/api/*` endpoints capped at 30 requests per 15 minutes per IP via `express-rate-limit`.
3. **Payload Capping**: Strict 100kb limit on `express.json()` prevents memory exhaustion exploits.
4. **Zod Validation**: Input payloads and Gemini outputs validated against `src/schemas/plan.ts` (guests 1–5,000, budget ₹10k–₹10Cr, strings capped).
5. **Prompt Injection Defense**: `sanitizeUserText()` strips control characters and filters injection patterns (`ignore previous instructions`, `system prompt`).
6. **No Leakage**: Production catch blocks suppress stack traces, file paths, and environment internals.
7. **Storage Tamper Resilience**: Corrupted or out-of-schema `localStorage` plans are discarded on startup without crashing the interface.

---

## Accessibility (WCAG 2.1 AA)

- **Keyboard Navigation**: Includes a skip-to-main-content link (`#main`), visible high-contrast `focus-visible` rings (`#B45309` light / `#F5A623` dark), and keyboard trap in `HistoryDrawer` (`Escape` to close).
- **WAI-ARIA Tabs**: Full implementation with roving `tabindex`, arrow key navigation, `Home`/`End` support, `role="tablist"`, `role="tab"`, and `role="tabpanel"`.
- **Live Regions**: Visually hidden `aria-live="polite"` region announces generation progress, plan updates, diff summaries, and errors.
- **Budget Donut Table Alternative**: Donut chart includes a "View as table" toggle providing an accessible HTML `<table>` with `<caption>`, headers, percentages, and formatted currency amounts.
- **Contrast Ratios**: Palette adjusted to exceed 4.5:1 text contrast on cream backgrounds (`#B45309` on `#FFF8EE` = 5.27:1) while retaining `#F5A623` on dark mode (8.35:1).
- **Reduced Motion**: Disables transitions, animations, and celebratory confetti when `prefers-reduced-motion: reduce` is active.
- **Zero Axe Violations**: Maintained through `vitest-axe` in continuous integration.

---

## Docker Deployment

The application features a secure, multi-stage Docker build running as an unprivileged user (`node`):

```bash
# Build Docker image
docker build -t utsav-event-planner:1.0.0 .

# Run container on port 3000
docker run -p 3000:3000 -e GEMINI_API_KEY="your-key" utsav-event-planner:1.0.0
```

### Healthcheck
The container includes a built-in health check on `/api/health`:
```bash
curl http://localhost:3000/api/health
# Response: {"status":"ok","timestamp":"...","service":"utsav-event-planner"}
```

---

## Known Limitations

- **Speech Recognition Support**: Voice input uses the Web Speech API (`webkitSpeechRecognition`), supported primarily in Chromium-based browsers (Chrome, Edge) and Safari. Fallback to standard text input is always available.
- **Offline / Fallback Accuracy**: When operating without a `GEMINI_API_KEY` or during network timeouts, Utsav falls back to deterministic rule-based algorithms. Complex, highly nuanced multi-field replan queries are best served with an active Gemini connection.
- **Currency Default**: Default calculations and parsing are optimized for Indian Rupees (INR, Lakhs, Crores).

---

## License

This project is licensed under the [Apache License 2.0](LICENSE).
