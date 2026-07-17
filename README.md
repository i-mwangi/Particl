<div align="center">

<img src="frontend/public/logo.png" alt="Particl" width="72" />

# Particl

**Academic writing, *refined.***

An intelligent LaTeX writing companion that understands your research — streamlining structure, getting the mathematics right, reading your reference papers, and offering contextual suggestions to elevate your drafts.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.135+-green.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-App_Router-black.svg)](https://nextjs.org/)
[![Qwen](https://img.shields.io/badge/LLM-Qwen_3.7-6f42c1.svg)](https://www.alibabacloud.com/en/product/modelstudio)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Features](#features) • [Document Types](#document-types) • [Quick Start](#quick-start) • [Architecture](#architecture) • [API](#api) • [Deployment](#deployment)

</div>

---

## Overview

Particl removes LaTeX as a barrier. No syntax, no missing packages, no cryptic compile errors — just describe the document you need, or drop in a dataset, and watch it write itself.

**For researchers, it's more than a formatter.** Particl is an intelligent LaTeX writing companion that understands academic research: it streamlines document structure, generates accurate mathematical syntax, reads reference papers you attach so your work is grounded in real sources, and offers contextual suggestions to elevate the quality of your academic drafts.

**How a document happens:**

1. **Describe it in plain English** — a resume, a lab report, a thesis, a slide deck.
2. **Watch it write itself** — the LaTeX streams in live as the agent plans the structure.
3. **Data becomes documents** — upload a CSV and it builds tables and charts from your real numbers, never invented ones.
4. **It fixes its own mistakes** — compile errors are read, corrected, and recompiled automatically (up to 3 attempts) until the PDF builds.
5. **Refine by conversation** — ask for changes in plain language, or edit the code directly and recompile.
6. **Export and share** — download the PDF or the raw `.tex`.

## Features

| Feature | Description |
|---------|-------------|
| **Natural language input** | No LaTeX knowledge required — plain English in, PDF out |
| **Live streaming generation** | LaTeX appears character by character as the agent writes |
| **Self-correcting compilation** | The agent reads pdflatex errors and repairs its own code, up to 3 retries |
| **Two-pass compilation** | Tables of contents, cross-references, and citations resolve correctly |
| **CSV data grounding** | Uploaded data is summarized and injected into generation — tables and pgfplots charts come from real rows |
| **Reference-paper ingestion** | Attach a PDF; its text is extracted and fed as context so the draft draws on real research and cites it |
| **Draft review agent** | One click critiques the draft (and any attached papers) with severity-ranked suggestions on structure, citations, math, clarity and rigor — apply any of them with the agent |
| **Document-type awareness** | Papers get depth and structure; CVs stay on one page; presentations use beamer; theses get real chapters |
| **Split-pane editor** | Monaco-based LaTeX editor beside a live PDF preview, with a draggable divider |
| **Focus mode** | Hide the code (`main.tex` toggle) and the PDF takes center stage at 110% zoom |
| **Conversation memory** | Iterate on a document across messages; full version history per document |
| **Onboarding & auth** | Session-based auth with Redis, first-run onboarding, per-user document library |

## Document Types

Every type below has been verified end-to-end — real prompt → generated LaTeX → compiled PDF:

| Type | What the agent does |
|------|--------------------|
| **Reports / Papers** | `article` class, abstract, numbered sections, TOC, tables, charts |
| **Specifications** | Structured functional / non-functional requirement sections |
| **Proposals** | Budget tables, timelines, clean professional layout |
| **Theses / Books** | `report` class with real `\chapter` divisions, equations, references |
| **Lecture notes** | Definitions, theorems, worked examples — complex math is LaTeX's home turf |
| **Presentations** | `beamer` class, one idea per frame, title + outline frames, TikZ diagrams |
| **CVs / Resumes** | Compact one-page layout, no padding |
| **Letters** | `letter` class with proper opening/closing blocks |
| **Invoices** | Booktabs line items with totals, built from uploaded data |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), TypeScript, Monaco editor, react-pdf |
| Backend | FastAPI (Python 3.11+), LangGraph agent orchestration |
| LLM | Qwen 3.7 via Alibaba Cloud Model Studio (OpenAI-compatible endpoint) |
| Compiler | pdflatex (TeX Live), with automatic package/library injection fixes |
| Database & storage | Supabase (PostgreSQL + PDF storage) |
| Sessions & rate limiting | Upstash Redis |
| Background jobs | Celery |

## Quick Start

### Prerequisites

- **Python 3.11+** and **[uv](https://github.com/astral-sh/uv)**
- **Node.js 18+**
- **TeX Live** (pdflatex must be on PATH) — [install](https://www.tug.org/texlive/)
- **Supabase** project (database + storage) — [sign up](https://supabase.com)
- **Upstash** Redis instance — [sign up](https://upstash.com)
- **Qwen API key** from [Alibaba Cloud Model Studio](https://www.alibabacloud.com/en/product/modelstudio)

### 1. Clone

```bash
git clone https://github.com/i-mwangi/Particl.git
cd Particl
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # then fill in your keys (see below)
uv sync
# Run backend/db/schema.sql in the Supabase SQL editor (Dashboard -> SQL Editor)
uv run uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open `http://localhost:3000`, create an account, and try:

> *"A short beamer presentation introducing the Pythagorean theorem, with a worked example and a TikZ diagram"*

### Environment Variables (`backend/.env`)

```bash
# Qwen (Alibaba Cloud Model Studio)
QWEN_API_KEY=sk-...                        # DASHSCOPE_API_KEY also works
QWEN_MODEL=qwen3.7-plus                    # or qwen3.7-max for maximum quality
QWEN_BASE_URL=https://<WorkspaceId>.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
QWEN_MAX_OUTPUT_TOKENS=65536

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=...
UPSTASH_REDIS_HOST=your-redis.upstash.io
UPSTASH_REDIS_PORT=6379
UPSTASH_REDIS_PASSWORD=...

# Security
JWT_SECRET=a_random_secret_at_least_32_chars
```

## Architecture

```
Browser (Next.js)
   │  prompt / CSV upload            SSE stream: latex chunks, status, pdf_url
   ▼
FastAPI backend
   │  CORS → rate limit (Redis) → session auth
   ▼
LangGraph agent
   generate ──► compile (pdflatex, two-pass when TOC/refs present)
        ▲              │
        │   errors     ▼
   LLM fix loop ◄── failed?   (max 3 attempts; deterministic fixes
                               for missing packages, TikZ libraries,
                               bare underscores, truncated output)
        │
        ▼
   PDF → Supabase Storage      records → PostgreSQL (documents, versions,
                                          conversations, users + onboarding)
```

**Why the fix loop works:** compilation success requires a clean process exit — a partial PDF is treated as a failure, so real errors always reach the agent. Deterministic fixes (package injection, underscore escaping) handle the common cases instantly; the LLM handles the rest with the compiler log as context.

## API

Interactive docs at `http://localhost:8000/docs` when the backend is running.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` · `/auth/login` · `/auth/logout` · `/auth/me` | POST/GET | Session auth (HTTP-only cookie, Redis-backed) |
| `/auth/onboarding` | POST | Save a new user's onboarding answers |
| `/v2/agent/stream` | POST | Generate a document — streams SSE events (status, latex, pdf_url) |
| `/v2/agent/async` | POST | Generate via background job; poll `/status/{job_id}` |
| `/v2/agent/review` | POST | Review a draft (and attached papers); returns ranked suggestions |
| `/compile` | POST | Compile arbitrary LaTeX to a PDF |
| `/files` | POST | Upload a CSV (data), image, or PDF reference paper |
| `/documents` · `/documents/{id}/versions` | GET/POST/DELETE | Document library and version history |
| `/conversations` | GET/DELETE/PATCH | Conversation history |

## Project Structure

```
Particl/
├── backend/
│   ├── api/            # FastAPI routes (streaming agent, compile, files)
│   ├── auth/           # Session auth + onboarding
│   ├── graph/          # LangGraph agent: nodes, state, generation prompt
│   ├── tools/          # LaTeX compiler with self-healing fixes
│   ├── services/       # CSV parsing, storage, LLM client
│   ├── db/             # Supabase queries + schema.sql
│   └── tasks/          # Celery app
└── frontend/
    └── src/
        ├── app/        # Landing, auth, onboarding, dashboard, editor
        ├── components/ # LatexEditor (Monaco), PdfViewer, AgentPanel
        └── lib/        # API client, auth context, session storage
```

## Deployment

**Live production setup:**

- **Frontend** → **Vercel** (`particl-rho.vercel.app`). Root directory `frontend`; set `NEXT_PUBLIC_API_URL` to the backend URL (baked in at build time — redeploy after changing it).
- **Backend** → **Azure App Service** (Linux container, B2 plan). The image (FastAPI + TeX Live, see `backend/Dockerfile`) is built by **GitHub Actions** on every `backend/**` change and pushed to the **GitHub Container Registry** (`ghcr.io/i-mwangi/particl-backend`); App Service pulls it. Secrets and runtime config (`FRONTEND_ORIGIN`, `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`, `LATEX_MAX_MEMORY_MB`) are set as Azure app settings.
- **Database & storage** → **Supabase**: run `backend/db/schema.sql` once; create a public-read `pdfs` storage bucket.
- **Sessions & rate limiting** → **Upstash Redis**.

> **Why a container, not serverless:** the backend spawns `pdflatex` and streams
> long generations, so it needs a real runtime with TeX Live installed and no hard
> request timeout — Vercel/Lambda-style functions can't host it. Size the plan
> above the LaTeX memory cap (B2 = 3.5 GB comfortably covers `LATEX_MAX_MEMORY_MB=2048`).

**Portable alternative:** the backend is host-agnostic — any container host
(Railway, Render, Fly, ECS) works as long as the image includes TeX Live and it
runs `uvicorn main:app --host 0.0.0.0` behind HTTPS with the env vars set.

**Security:** strong `JWT_SECRET`, `FRONTEND_ORIGIN` restricting CORS to your
frontend, `SameSite=None; Secure` cookies for the cross-domain setup, and
`rediss://` URLs for Redis in production.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `model not found` on generation | Check `QWEN_MODEL` against the model list in your Model Studio workspace |
| 401 from Qwen | `QWEN_API_KEY`/`DASHSCOPE_API_KEY` missing or wrong region — the workspace ID in `QWEN_BASE_URL` must match the key's region |
| Empty table of contents | Fixed — the compiler runs two passes when `\tableofcontents`/`\ref`/`\cite` are present |
| `Missing $ inserted` | Fixed — bare underscores are escaped by prompt rules and a deterministic compiler fix |
| CORS errors on login | CORS middleware must run before auth middleware (already ordered correctly) |
| Celery ignores jobs | Use the `rediss://` wire-protocol URL, not the `https://` REST URL |

## More Documentation

- [Problem specialization](PROBLEM_SPECIALIZATION.md) — the problem Particl targets and why
- [Agent metrics](AGENT_METRICS.md) · [Benchmarks](BENCHMARKS.md)
- [Backend API details](backend/README.md) · [Frontend notes](frontend/README.md)

## License

MIT — see [LICENSE](LICENSE).
