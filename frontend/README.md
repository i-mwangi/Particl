# Particl Frontend

Next.js (App Router) client for Particl — the interface where you describe a
document, watch the LaTeX stream in, see the PDF compile beside it, refine by
conversation, and **review** the draft for academic quality.

## Stack

- **Next.js (App Router)** + TypeScript
- **Monaco** editor for LaTeX, **react-pdf** for the live PDF preview
- Session cookies via a small typed API client (`src/lib/api.ts`)
- Theme via CSS variables (paper/light aesthetic); brand font **Pixelify Sans**

## Structure

```
frontend/src/
├── app/
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Root layout + AuthProvider
│   ├── globals.css        # Theme variables, animations, responsive rules
│   ├── login/ register/   # Auth pages
│   ├── onboarding/        # Four-step first-run onboarding
│   ├── app/
│   │   ├── page.tsx       # Dashboard (new project, uploads, recent projects)
│   │   └── editor/        # Main editor (generate / edit / compile / review)
│   └── about/ contact/ terms/ privacy/
├── components/            # See table below
└── lib/
    ├── api.ts             # Typed API client
    ├── auth.tsx           # AuthProvider context
    └── session-storage.ts # Session/hand-off helpers
```

Set `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8000`) to point at the backend.
It is baked in at build time — **redeploy after changing it.**

## Components

| Component | Role |
|-----------|------|
| `LatexEditor` | Monaco-based LaTeX editor |
| `PdfViewer` / `PdfThumbnail` | react-pdf preview and dashboard thumbnails |
| `AgentPanel` | The agent chat (full-width bottom sheet on mobile) + document-feature checklist |
| `Sidebar` | Session/project navigation |
| `DocTypeCarousel` | Auto-gliding document-type strip on the landing page |
| `HowItWorks` | Auto-cycling prompt → cards → compiled-page showcase |
| `StorySection` | Scroll-revealed "sentence to PDF" timeline |
| `DotIcon` / `DotTick` | Landing icons drawn as twinkling dots |
| `PixelBlast` | Animated pixel-field hero backdrop |

## Pages

- **`/`** — Landing: hero (logo + "Academic writing, refined."), document-type
  carousel, feature grid, story timeline, visualizations showcase, CTA.
- **`/login` · `/register`** — Session auth.
- **`/onboarding`** — Four-step first-run flow (welcome → use case → discovery →
  done), persisted to the user record.
- **`/app`** — Dashboard: start a new project, drop in files (CSV / image / PDF),
  and open recent projects.
- **`/app/editor`** — The core workspace (below).
- **`/about` · `/contact` · `/terms` · `/privacy`** — Static pages.

## The editor (`/app/editor`)

- **Live generation** — the LaTeX streams in character by character; the agent
  panel narrates planning → generating → compiling → fixing.
- **Split view** — Monaco editor beside the PDF, with a **draggable resizer**.
  Toggle `main.tex` to hide the code and enter a centered **focus view** of the PDF.
- **Refine by conversation** — type a change ("remove this section") and the agent
  edits the current document, recompiles, and updates the PDF in place.
- **Attachments** — CSV (data-grounded tables/charts), images
  (`\includegraphics`), and **PDF reference papers** (grounding + review).
- **Review** — the **Review** button critiques the draft (and any attached papers)
  and opens a panel of severity-ranked suggestions; each has **Apply with agent**,
  which sends that suggestion back as a targeted edit.
- **Export** — download the compiled PDF or the raw `.tex`.
- **Mobile** — the toolbar collapses to icons, panes stack vertically, and the
  agent becomes a bottom sheet.

## API client (`src/lib/api.ts`)

```ts
api.auth        // register, login, logout, me, saveOnboarding
api.files       // upload(file)  → CSV | image | PDF, returns { file_id, kind, ... }
api.agent       // stream(prompt, onChunk, history, convId, fileIds)
                // compile(latex, fileIds), review(latex, fileIds)
                // submitAsync(prompt), getStatus(jobId)
api.documents   // list, get, create, delete, getVersions, getVersion
api.conversations // list, get, delete, touch
```

- **`agent.stream`** consumes Server-Sent Events; `onChunk` receives
  `{ status, latex, pdf_url, message, ... }` (status ∈
  `planning · generating · compiling · fixing · done · failed`).
- **`agent.review`** resolves to `{ summary, suggestions[], reviewed_papers[] }`.
- All requests go through `fetchWithCookies` (credentials included) so the
  session cookie authenticates every call.

## Auth context (`src/lib/auth.tsx`)

`AuthProvider` exposes `{ user, loading, login, register, logout }`; the app reads
it to gate routes and personalize the header.

## Theming

CSS variables in `globals.css` (`--bg-base`, `--bg-surface`, `--accent`,
`--text-primary`, `--border`, …). Headings and brand text use Pixelify Sans;
a `@media (max-width: 768px)` block handles the mobile layout.

## Scripts

```bash
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```
