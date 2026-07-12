# Particl backend: FastAPI + TeX Live (pdflatex) in one image.
FROM python:3.13-slim

# --- System deps: a curated TeX Live that covers every package Particl uses ---
# (pdflatex, beamer, tikz/pgfplots, pgfgantt, pgf-pie, quantikz, siunitx,
#  listings, booktabs, fancyhdr, geometry, helvet, rotating, marginnote,
#  underscore, ...). This is ~2 GB - far smaller than texlive-full (~5 GB).
RUN apt-get update && apt-get install -y --no-install-recommends \
      texlive-latex-base \
      texlive-latex-recommended \
      texlive-latex-extra \
      texlive-fonts-recommended \
      texlive-fonts-extra \
      texlive-pictures \
      texlive-science \
      texlive-plain-generic \
      lmodern \
      ghostscript \
      curl \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# --- uv (fast Python package manager) ---
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install Python deps first (layer cache): only re-runs when lockfile changes
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# App source
COPY . .

ENV PATH="/app/.venv/bin:$PATH"
# App Service sends traffic to the port in WEBSITES_PORT; default to 8000.
ENV PORT=8000
EXPOSE 8000

# Shell form so ${PORT} expands. One worker: the compile subprocess is heavy
# and Redis holds shared state, so scale with replicas, not in-process workers.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
