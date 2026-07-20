# Simpleton Backend

FastAPI service that turns natural-language prompts into compiled LaTeX PDFs. It
orchestrates a Qwen-powered agent that **plans → generates → compiles → fixes its
own errors**, grounds documents in uploaded data and reference papers, and can
**review** a draft for academic quality.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.13) |
| LLM | Qwen 3.7 via Alibaba Cloud Model Studio (OpenAI-compatible endpoint), through LangChain `ChatOpenAI` |
| Agent orchestration | LangGraph (`graph/`) + agent wrappers (`agents/`) |
| Compiler | `pdflatex` (TeX Live), multi-engine fallback, memory/timeout guarded |
| Database & PDF storage | Supabase (PostgreSQL + Storage) |
| Sessions, cache & rate limiting | Upstash Redis |
| Background jobs | Celery (optional; async generation path) |

## How a document is produced

```
prompt (+ optional CSV / image / PDF)
      │
      ▼
 build context ──► GENERATE (Qwen, streamed)
      │                   │  LaTeX
      ▼                   ▼
 attached files    COMPILE (pdflatex, two-pass when TOC/refs present)
 (data grounding,        │
  image staging,    ┌────┴─── clean exit? ──► upload PDF to Supabase ──► done
  paper text)       │
                    └── error ──► FIX (deterministic + LLM, ≤3 retries) ──► recompile
```

- **Self-correction:** a compile only counts as success on a clean process exit —
  a partial PDF is treated as failure, so real errors always reach the fix loop.
  Deterministic fixes (missing packages, TikZ libraries, bare underscores,
  truncated output) run first; the LLM handles the rest with the compiler log.
- **Two-pass compilation** runs automatically when the document contains a table
  of contents, cross-references, citations, or `remember picture`/`tikzmark`.
- **Memory guard:** `pdflatex` is capped (`LATEX_MAX_MEMORY_MB`, default 2048) so a
  runaway compile fails as a retryable error instead of OOM-killing the container.

## Module map

| Directory | Responsibility |
|-----------|----------------|
| `api/routes.py` | All non-auth HTTP routes |
| `auth/` | Session auth (register/login/logout/me/onboarding), cookie + Redis sessions |
| `graph/nodes.py` | Agent prompts (`_GENERATE_SYSTEM`, `_FIX_SYSTEM`, `_REVIEW_SYSTEM`), the Qwen client, and the generate/fix nodes |
| `agents/` | LangGraph agent + legacy generator wrappers |
| `tools/compiler.py` | Multi-engine LaTeX compilation, memory/timeout limits, image staging |
| `services/files.py` | CSV parsing, image storage, PDF paper text extraction, prompt-context builders |
| `services/storage.py` | PDF upload to Supabase Storage |
| `db/` | Supabase queries: users, documents, versions, conversations |
| `cache_redis/` | Redis client, response cache, rate limiter |
| `tasks/` | Celery tasks for async generation/compilation |
| `models/` | Pydantic request/response models |

## Endpoints

Interactive docs at `/docs` when running.

### Auth (`auth/routes.py`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create a user; sets `session_id` cookie |
| POST | `/auth/login` | Authenticate; sets `session_id` cookie |
| POST | `/auth/logout` | End the session |
| GET | `/auth/me` | Current user (401 if no valid session) |
| POST | `/auth/onboarding` | Save a new user's onboarding answers (JSONB) |

Cookie flags are environment-driven: set `COOKIE_SAMESITE=none` and
`COOKIE_SECURE=true` when the frontend and backend are on different domains.

### Generation & compilation (`api/routes.py`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v2/agent/stream` | Generate a document — streams SSE events (status, latex, pdf_url). Accepts `conversation_history` and `file_ids` for refinement and grounding |
| POST | `/v2/agent/async` | Queue generation as a background job |
| GET | `/status/{job_id}` | Poll an async job |
| POST | `/v2/agent` | Non-streaming single-shot generation |
| POST | `/v2/agent/review` | **Review a draft** (and attached papers); returns severity-ranked suggestions |
| POST | `/compile` | Compile arbitrary LaTeX to a PDF (stages attached images) |
| POST | `/generate` | Legacy synchronous generation |
| POST | `/files` | Upload a **CSV** (data), **image** (`\includegraphics`), or **PDF reference paper** |

### Documents, versions & conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/documents` · `/documents/{id}` | List, create, fetch, `PUT` update, `DELETE` |
| GET | `/documents/{id}/versions` · `/versions/{version_id}` | Full version history |
| GET | `/conversations` · `/conversations/{id}` | List / fetch |
| PATCH/DELETE | `/conversations/{id}` | Update status/title, delete |
| GET | `/` | Health check |
| POST | `/contact` | Contact form |

### Streaming event shape (`/v2/agent/stream`)

```json
{ "status": "generating", "latex": "\\documentclass...", "pdf_url": "",
  "retries": 0, "conversation_id": "uuid", "message": "Generating LaTeX..." }
```
`status` ∈ `planning · generating · compiling · fixing · done · failed`.

### Review response shape (`/v2/agent/review`)

Request: `{ "latex": "...", "file_ids": ["<uploaded paper id>"] }`

```json
{
  "summary": "one-line assessment of the draft",
  "suggestions": [
    { "category": "citations", "severity": "high",
      "title": "Cite the attached paper for this claim",
      "detail": "...", "location": "Section 2" }
  ],
  "reviewed_papers": ["nature-of-light.pdf"]
}
```
Categories: `structure · citations · math · clarity · rigor · formatting · completeness`.

## File ingestion

`POST /files` dispatches by extension (max 5 MB each):

- **CSV** → parsed to a compact summary (columns, dtypes, numeric stats, sample
  rows) injected into generation so tables/charts come from real data.
- **PNG/JPG** → validated by magic bytes, stored on disk, staged into the compile
  directory so `\includegraphics{filename}` resolves.
- **PDF** → text extracted (`pypdf`, capped at `MAX_PAPER_CHARS`) and fed as
  reference context so the agent grounds the document in real research and can be
  reviewed against it. Scanned/image-only PDFs are rejected with a clear message.

## Rate limiting & errors

- Rate limit: 60 requests / 60 s per client → `429 {"detail": "Rate limit exceeded"}`.
- Errors use `{"detail": "..."}`. Unhandled exceptions return `500` as JSON **with**
  CORS headers, so the browser shows the real error instead of a misleading CORS block.
- Common codes: `400` bad request · `401` unauthorized · `404` not found ·
  `429` rate limited · `500` server error.

## Environment variables

```bash
# Qwen (Alibaba Cloud Model Studio)
QWEN_API_KEY=sk-...            # or DASHSCOPE_API_KEY
QWEN_MODEL=qwen3.7-plus
QWEN_FALLBACK_MODELS=qwen3.5-plus-2026-02-15,qwen3-max,qwen-max   # tried in order if the primary errors or runs out of quota
QWEN_BASE_URL=https://<WorkspaceId>.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
QWEN_MAX_OUTPUT_TOKENS=65536

# Supabase
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Upstash Redis
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Security & runtime
JWT_SECRET=at_least_32_chars
FRONTEND_ORIGIN=https://your-frontend        # added to CORS allowlist
COOKIE_SAMESITE=none                          # cross-site deploys
COOKIE_SECURE=true                            # cross-site deploys
LATEX_MAX_MEMORY_MB=2048                       # cap below container RAM
```

## Run locally

```bash
cp .env.example .env        # fill in keys
uv sync
# run backend/db/schema.sql in the Supabase SQL editor once
uv run uvicorn main:app --reload --port 8000
```

Requires **TeX Live** (`pdflatex` on PATH). For containerized deployment, the
`Dockerfile` bundles a curated TeX Live install; see the top-level `README.md`
Deployment section.
