import io
import json
import os
import re
import uuid
from typing import Optional

import pandas as pd

from cache_redis.client import get_redis

FILE_TTL_SECONDS = 86400  # match session TTL (24h)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_SAMPLE_ROWS = 20
MAX_UNIQUE_VALUES = 10

ALLOWED_EXTENSIONS = {".csv", ".png", ".jpg", ".jpeg", ".pdf"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}
PDF_EXTENSIONS = {".pdf"}

# How much extracted paper text to keep as LLM context (~4k tokens).
MAX_PAPER_CHARS = 16000

# Image bytes live on local disk (the compiler runs on the same machine);
# only the small metadata summary goes to Redis.
UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"
)


class FileValidationError(Exception):
    pass


def _numeric_summary(df: pd.DataFrame) -> dict:
    numeric = df.select_dtypes(include="number")
    if numeric.empty:
        return {}
    stats = numeric.describe().round(4)
    return {col: stats[col].to_dict() for col in stats.columns}


def parse_csv(filename: str, content: bytes) -> dict:
    """Parse an uploaded CSV into a compact summary for LLM context."""
    if len(content) > MAX_FILE_SIZE:
        raise FileValidationError(
            f"File too large ({len(content)} bytes > {MAX_FILE_SIZE} bytes)"
        )
    if not content.strip():
        raise FileValidationError("File is empty")

    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise FileValidationError(f"Could not parse CSV: {e}")

    if df.empty:
        raise FileValidationError("CSV contains no data rows")

    sample = df.head(MAX_SAMPLE_ROWS)
    categorical_values = {}
    for col in df.select_dtypes(exclude="number").columns:
        uniques = df[col].dropna().unique()
        if len(uniques) <= MAX_UNIQUE_VALUES:
            categorical_values[col] = [str(v) for v in uniques]

    return {
        "filename": filename,
        "row_count": int(len(df)),
        "columns": [
            {"name": str(col), "dtype": str(df[col].dtype)} for col in df.columns
        ],
        "numeric_summary": _numeric_summary(df),
        "categorical_values": categorical_values,
        "sample_csv": sample.to_csv(index=False),
    }


def _safe_image_name(filename: str) -> str:
    """Make a filename LaTeX-safe: ascii letters/digits/dashes only."""
    base, ext = os.path.splitext(os.path.basename(filename or "image"))
    base = re.sub(r"[^a-zA-Z0-9-]", "-", base).strip("-").lower() or "image"
    return f"{base}{ext.lower()}"


def parse_image(user_id: str, filename: str, content: bytes) -> dict:
    """Validate an uploaded image, store its bytes on disk, return a summary."""
    if len(content) > MAX_FILE_SIZE:
        raise FileValidationError(
            f"File too large ({len(content)} bytes > {MAX_FILE_SIZE} bytes)"
        )
    if not content:
        raise FileValidationError("File is empty")

    ext = os.path.splitext(filename or "")[1].lower()
    # Magic-byte check so a renamed non-image can't reach the compiler
    is_png = content[:8] == b"\x89PNG\r\n\x1a\n"
    is_jpg = content[:3] == b"\xff\xd8\xff"
    if ext == ".png" and not is_png:
        raise FileValidationError("File is not a valid PNG image")
    if ext in {".jpg", ".jpeg"} and not is_jpg:
        raise FileValidationError("File is not a valid JPEG image")

    safe_name = _safe_image_name(filename)
    store_name = f"{uuid.uuid4().hex[:8]}-{safe_name}"
    user_dir = os.path.join(UPLOAD_DIR, user_id)
    os.makedirs(user_dir, exist_ok=True)
    path = os.path.join(user_dir, store_name)
    with open(path, "wb") as f:
        f.write(content)

    return {
        "kind": "image",
        "filename": safe_name,
        "path": path,
        "size_bytes": len(content),
    }


def parse_pdf(filename: str, content: bytes) -> dict:
    """Extract text from an uploaded reference paper (PDF) for LLM context."""
    if len(content) > MAX_FILE_SIZE:
        raise FileValidationError(
            f"File too large ({len(content)} bytes > {MAX_FILE_SIZE} bytes)"
        )
    if content[:5] != b"%PDF-":
        raise FileValidationError("File is not a valid PDF")

    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        pages = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
            if sum(len(p) for p in pages) > MAX_PAPER_CHARS:
                break
        text = "\n".join(pages).strip()
    except Exception as e:
        raise FileValidationError(f"Could not read PDF: {e}")

    if not text:
        raise FileValidationError(
            "No selectable text found in the PDF (it may be a scanned image)."
        )

    # Collapse runaway whitespace and cap the length.
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    truncated = len(text) > MAX_PAPER_CHARS
    text = text[:MAX_PAPER_CHARS]

    return {
        "kind": "paper",
        "filename": os.path.basename(filename or "paper.pdf"),
        "page_count": len(reader.pages),
        "char_count": len(text),
        "truncated": truncated,
        "text": text,
    }


def get_image_paths(user_id: str, file_ids: list) -> list:
    """(latex_filename, disk_path) pairs for attached images that still exist."""
    pairs = []
    for file_id in file_ids or []:
        summary = get_file_summary(user_id, file_id)
        if (
            summary
            and summary.get("kind") == "image"
            and os.path.isfile(summary.get("path", ""))
        ):
            pairs.append((summary["filename"], summary["path"]))
    return pairs


def store_file_summary(user_id: str, summary: dict) -> str:
    """Store a parsed file summary in Redis, return its file_id."""
    file_id = str(uuid.uuid4())
    redis = get_redis()
    redis.setex(
        f"file:{user_id}:{file_id}", FILE_TTL_SECONDS, json.dumps(summary)
    )
    return file_id


def get_file_summary(user_id: str, file_id: str) -> Optional[dict]:
    redis = get_redis()
    raw = redis.get(f"file:{user_id}:{file_id}")
    return json.loads(raw) if raw else None


def get_papers(user_id: str, file_ids: list) -> list:
    """Return (filename, text) for uploaded reference papers still in cache."""
    papers = []
    for file_id in file_ids or []:
        summary = get_file_summary(user_id, file_id)
        if summary and summary.get("kind") == "paper" and summary.get("text"):
            papers.append((summary["filename"], summary["text"]))
    return papers


def build_data_context(user_id: str, file_ids: list) -> str:
    """Build the prompt block describing uploaded data files."""
    blocks = []
    image_names = []
    paper_blocks = []
    for file_id in file_ids:
        summary = get_file_summary(user_id, file_id)
        if not summary:
            continue

        if summary.get("kind") == "image":
            image_names.append(summary["filename"])
            continue

        if summary.get("kind") == "paper":
            note = " (truncated)" if summary.get("truncated") else ""
            paper_blocks.append(
                f"### Reference paper: {summary['filename']}"
                f" ({summary.get('page_count', '?')} pages){note}\n"
                f"{summary['text']}"
            )
            continue

        lines = [
            f"### Data file: {summary['filename']} "
            f"({summary['row_count']} rows)",
            "Columns: "
            + ", ".join(
                f"{c['name']} ({c['dtype']})" for c in summary["columns"]
            ),
        ]
        if summary.get("numeric_summary"):
            lines.append(
                "Numeric statistics (per column): "
                + json.dumps(summary["numeric_summary"])
            )
        if summary.get("categorical_values"):
            lines.append(
                "Categorical values: " + json.dumps(summary["categorical_values"])
            )
        lines.append(
            f"First rows (CSV):\n{summary['sample_csv']}"
        )
        blocks.append("\n".join(lines))

    parts = []
    if paper_blocks:
        parts.append(
            "\n\nThe user attached the following reference paper(s). Use them to ground "
            "the document in the real research: draw on their definitions, methods, "
            "findings and terminology, and cite them where appropriate. Do NOT copy "
            "sentences verbatim - paraphrase and synthesize in the user's own document.\n\n"
            + "\n\n".join(paper_blocks)
        )

    if image_names:
        names = ", ".join(image_names)
        parts.append(
            "\n\nThe user uploaded the following image file(s), available to the "
            f"compiler by EXACT filename: {names}. Include each one where it fits "
            "with \\usepackage{graphicx} and "
            "\\includegraphics[width=0.8\\textwidth]{filename} inside a figure "
            "environment with a \\caption. Use the exact filename given - never "
            "invent, rename, or reference image files that are not in this list."
        )

    if blocks:
        parts.append(
            "\n\nThe user uploaded the following data file(s). Build the document "
            "from this REAL data: present it with booktabs tables and plot it with "
            "pgfplots (\\addplot table with inline coordinates from the rows below). "
            "Never invent data values that are not derivable from this data.\n"
            "IMPORTANT: column names may contain underscores (e.g. infill_pattern). "
            "A bare _ in LaTeX text breaks compilation. When mentioning a column in "
            "prose or table headers, escape it (\\texttt{infill\\_pattern}) or "
            "rewrite it in words (infill pattern). Never write a raw _ outside math.\n\n"
            + "\n\n".join(blocks)
        )

    return "".join(parts)
