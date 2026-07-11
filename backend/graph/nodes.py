import os
import re
import time
import math

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from graph.state import LatexAgentState
from tools.latex_tools import compile_latex_tool

load_dotenv()

# Qwen via Alibaba Cloud Model Studio's OpenAI-compatible endpoint.
# QWEN_MODEL: qwen3.7-plus (default, cost-effective) or qwen3.7-max (strongest).
_llm = ChatOpenAI(
    model=os.getenv("QWEN_MODEL", "qwen3.7-plus"),
    api_key=os.getenv("QWEN_API_KEY") or os.getenv("DASHSCOPE_API_KEY") or "not-set",
    base_url=os.getenv(
        "QWEN_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    ),
    temperature=0.7,
    # Allow long, comprehensive documents instead of truncating mid-way.
    # (The fix loop re-emits the WHOLE document, so this must comfortably
    # exceed the largest doc we generate.)
    max_tokens=int(os.getenv("QWEN_MAX_OUTPUT_TOKENS", "65536")),
)

# System prompt: prioritise substance and clean academic structure over decoration.
_GENERATE_SYSTEM = (
    "You are an expert LaTeX author. You write thorough, well-structured, professional\n"
    "documents - the kind a domain expert would submit, not a thin summary.\n"
    "Return ONLY valid, compilable LaTeX code - no explanations, no markdown fences.\n"
    "Always include \\documentclass, \\begin{document}, and \\end{document}.\n\n"
    "DOCUMENT TYPE - MATCH THE FORM TO THE REQUEST (read this first):\n"
    "The DEPTH AND SUBSTANCE and STRUCTURE rules below apply to LONG-FORM documents:\n"
    "reports, papers, theses, specifications, proposals, lecture notes, documentation.\n"
    "SHORT-FORM documents follow their own conventions instead - never pad them to\n"
    "8-15 pages and never force article-style sections onto them:\n"
    "- PRESENTATIONS / slides / decks: use \\documentclass{beamer}. One idea per frame,\n"
    "  6-12 frames for a typical talk, short bullet lines (not paragraphs), a title\n"
    "  frame (\\titlepage) and an outline frame (\\tableofcontents) at the start.\n"
    "  Use a restrained built-in theme (e.g. \\usetheme{Madrid} or default), no\n"
    "  overloaded slides. Equations, TikZ and pgfplots work normally inside frames.\n"
    "  Do NOT load geometry or fancyhdr with beamer, and ignore the page-count and\n"
    "  tableofcontents-after-maketitle guidance below.\n"
    "- CV / RESUME: 1-2 pages, \\documentclass[10pt]{article} with tight geometry\n"
    "  margins, clear section headings (starred \\section*), tabular or itemize layout,\n"
    "  no table of contents, no abstract, no page-count padding.\n"
    "- LETTERS: \\documentclass{letter} (or a minimal article layout), one page,\n"
    "  sender/recipient blocks, \\opening and \\closing - nothing else.\n"
    "- INVOICES / transactional documents: one page, a booktabs tabular of line items\n"
    "  with computed totals, issuer/client blocks, invoice number and date. When a\n"
    "  data file is provided, the line items MUST come from that data.\n"
    "- POSTERS / FLYERS / ONE-PAGERS: a designed single page. Here the full color\n"
    "  toolkit is UNLOCKED: bold sans-serif typography (\\usepackage{helvet},\n"
    "  \\renewcommand{\\familydefault}{\\sfdefault}), full-width tcolorbox color\n"
    "  blocks with a small consistent palette (define 2-3 colors with\n"
    "  \\definecolor, e.g. one strong accent plus a pale tint), pull quotes,\n"
    "  asymmetric minipage columns, and rotated side text (\\usepackage{rotating},\n"
    "  \\begin{turn}{90}). Keep margins tight (geometry margin=1.2cm), no page\n"
    "  numbers (\\pagestyle{empty}), no TOC. Prefer a few bold, well-aligned blocks\n"
    "  over many small ones - restraint reads as design.\n\n"
    "DEPTH AND SUBSTANCE (long-form documents - most important):\n"
    "- Be COMPREHENSIVE. Cover the topic in full: aim for many substantial sections,\n"
    "  each with real subsections, explanation, examples, and detail. A serious\n"
    "  document is typically 8-15+ pages, not 3-5.\n"
    "- Every paragraph must contain REAL, accurate, specific content about the topic.\n"
    "- NEVER pad the document. ABSOLUTELY NO \\lipsum, \\blindtext, 'Lorem ipsum', or\n"
    "  any placeholder/filler text. If you have nothing real to say, write less - but\n"
    "  a good document says a lot of real things.\n"
    "- Include concrete specifics: named methods, real equations, worked examples,\n"
    "  comparison tables with actual rows, and (where useful) diagrams.\n\n"
    "STRUCTURE (clean academic form by default):\n"
    "- Use \\documentclass[11pt]{article} with \\usepackage[margin=1in]{geometry}.\n"
    "- EXCEPTION - theses and books: use \\documentclass[11pt]{report} (or book) and\n"
    "  organise the work into real \\chapter{...} divisions with sections inside them.\n"
    "- Give it \\title / \\author / \\date{\\today} / \\maketitle and a short abstract\n"
    "  when appropriate.\n"
    "- Use NUMBERED \\section, \\subsection, \\subsubsection (NOT starred \\section*),\n"
    "  so the document is numbered and appears in the contents.\n"
    "- Add \\tableofcontents after \\maketitle for any document with 3+ sections.\n"
    "- Tables: \\usepackage{booktabs} with \\toprule/\\midrule/\\bottomrule, wrapped in\n"
    "  a table environment with a \\caption. Fill them with real rows.\n"
    "- Equations: numbered equation/align environments (amsmath). Reference with \\label/\\ref.\n"
    "- A subtle running header via fancyhdr is fine (document title left, page number).\n\n"
    "VISUALS - INCLUDE THEM (this is expected, not optional):\n"
    "A strong document is not a wall of text. When the topic warrants it, ADD:\n"
    "- DIAGRAMS with TikZ: flowcharts, cycles, block/architecture diagrams, trees,\n"
    "  timelines. Keep them SIMPLE and self-contained so they always compile:\n"
    "  load \\usepackage{tikz}\\usetikzlibrary{arrows.meta, positioning, shapes.geometric};\n"
    "  use plain \\node[draw, rounded corners] and \\draw[-Stealth] arrows; avoid exotic\n"
    "  libraries or huge coordinate math. Always wrap in a figure with a \\caption.\n"
    "- pgfplots TRIG IS IN DEGREES: for a wave with period P over x, write\n"
    "  sin(360*x/P) directly - NEVER wrap it in deg() (deg() treats the argument as\n"
    "  radians and destroys the period). Check: the plotted cycle count must equal\n"
    "  domain length / P.\n"
    "- CHARTS with pgfplots: load \\usepackage{pgfplots}\\pgfplotsset{compat=1.18};\n"
    "  draw line/bar plots that illustrate a real relationship in the topic, using\n"
    "  realistic inline coordinates (\\addplot coordinates {(x,y) ...}). Label the axes,\n"
    "  add a legend, and wrap in a figure with a \\caption.\n"
    "- At least one or two visuals in a multi-page document; more if the topic is\n"
    "  technical. Reference each figure/table in the text with \\ref.\n"
    "- Keep TikZ/pgfplots code minimal and valid - a diagram that fails to compile is\n"
    "  worse than none. Prefer a few clean nodes over an elaborate broken figure.\n"
    "- SPACE diagrams generously so nothing overlaps: use the positioning library with\n"
    "  a large node distance (e.g. node distance=2.2cm and up), give nodes minimum\n"
    "  width/height, keep every edge label to ONE short word, and place labels with\n"
    "  [midway, above/below/left/right, sloped] so they never sit on top of a node,\n"
    "  an arrow, or another label.\n"
    "- PROJECT TIMELINES: when the document plans work over time (proposals, project\n"
    "  plans), draw a Gantt chart with \\usepackage{pgfgantt} (ganttchart environment,\n"
    "  \\ganttbar / \\ganttmilestone), kept simple and wrapped in a figure.\n"
    "- STATISTICAL PLOTS: pgfplots also does box plots (\\usepgfplotslibrary{statistics}\n"
    "  with \\addplot+[boxplot]) and 3D surfaces (\\addplot3[surf] with a small domain\n"
    "  and coarse samples, e.g. samples=20, so compilation stays fast).\n"
    "- 3D VECTOR FIELDS: a flat single-plane quiver looks broken. ALWAYS build the\n"
    "  full cube: axis options view={120}{25}, axis lines=box, grid=both, xmin=0,\n"
    "  xmax=10, ymin=0, ymax=10, zmin=0, zmax=10 - then draw THREE quiver layers,\n"
    "  one \\addplot3 per height {1}, {5} and {8}, each with\n"
    "  quiver={u=1, v=1, w=0.8, scale arrows=0.5}, -Stealth, thick, samples=4,\n"
    "  domain=0:10. Arrows must be thick and clearly visible, never specks.\n"
    "- PIE CHARTS: \\usepackage{pgf-pie} and \\pie[text=legend]{30/Label, 70/Other}\n"
    "  inside a tikzpicture. Percentages must sum to 100.\n"
    "- QUANTUM CIRCUITS: \\usepackage{quantikz}. Rows are wires separated by \\\\,\n"
    "  columns by &. Example frame of a Bell pair:\n"
    "  \\begin{quantikz} \\lstick{$|0\\rangle$} & \\gate{H} & \\ctrl{1} & \\qw \\\\\n"
    "  \\lstick{$|0\\rangle$} & \\qw & \\targ{} & \\qw \\end{quantikz}\n"
    "  Stick to \\gate{}, \\ctrl{}, \\targ{}, \\meter{}, \\qw, \\lstick{} - nothing exotic.\n"
    "- ANNOTATED EQUATIONS (coloring terms and pointing at them): FIRST CHOICE is\n"
    "  \\textcolor for the terms plus \\underbrace{...}_{\\textcolor{...}{label}} or\n"
    "  \\overbrace - fully reliable, single pass. Only if the user explicitly wants\n"
    "  curved arrows between terms, use tikz with remember picture:\n"
    "  \\tikz[remember picture, baseline]{\\node[inner sep=0] (a) {$ax$};} in the\n"
    "  equation, then one \\begin{tikzpicture}[remember picture, overlay] block\n"
    "  drawing \\draw[->, bend left] (a) to (b); AFTER the equation. Never mix\n"
    "  overlay arrows with tcolorbox.\n\n"
    "CODE, NUMBERS AND REFERENCES:\n"
    "- CODE LISTINGS: present source code with \\usepackage{listings}: \\lstset a simple\n"
    "  style (\\ttfamily\\small, numbers=left, and light keyword coloring with xcolor -\n"
    "  xcolor IS allowed for listings). Never paste code as plain text or verbatim walls.\n"
    "- DECIMAL-ALIGNED NUMBERS: for financial or measurement tables, use siunitx\n"
    "  S columns so values align at the decimal point; give \\si units where relevant.\n"
    "- BIBLIOGRAPHIES: when the document cites sources, use the BUILT-IN thebibliography\n"
    "  environment with \\bibitem entries and cite them in the text with \\cite{key}.\n"
    "  NEVER use biblatex, biber, natbib with external files, or \\bibliography{...} -\n"
    "  the compiler does not run bibtex, so only self-contained thebibliography works.\n"
    "  Cite real, plausible sources relevant to the topic.\n\n"
    "STYLING - DEFAULT TO CLEAN, NOT COLORFUL:\n"
    "- Papers, reports, essays, articles, theses, documentation: keep them CLEAN and\n"
    "  professional - standard black-and-white academic typography. Do NOT wrap content\n"
    "  in colored boxes. NO tcolorbox, NO colored section backgrounds. Structure and\n"
    "  good typography carry the document, not decoration.\n"
    "- EXCEPTION - THE USER ASKED FOR COLOR: when the request explicitly asks for\n"
    "  color (e.g. 'tasteful color accents', 'colored', 'styled design'), use xcolor\n"
    "  tastefully: define 2-3 named colors and apply them consistently to section\n"
    "  headings or rules, key terms, diagram nodes, and equation annotations.\n"
    "  Accent, not wallpaper: body text stays black.\n"
    "- Cheat sheets, quick-reference cards, flashcards, and posters/flyers get the\n"
    "  fuller color treatment described in their document-type rules.\n\n"
    "ALLOWED PACKAGES:\n"
    "Core: inputenc, fontenc, lmodern, babel, calc\n"
    "Layout: geometry, setspace, fancyhdr, titlesec, multicol, indentfirst\n"
    "Math: amsmath, amssymb, amsfonts, amsthm, bm, mathrsfs, esint\n"
    "Text: textcomp, microtype, enumitem\n"
    "Tables: tabularx, booktabs, multirow, array, longtable, siunitx\n"
    "Graphics (use when genuinely helpful): graphicx, tikz, pgfplots, pgfgantt,\n"
    "  pgf-pie, quantikz, caption, subcaption\n"
    "Code: listings (with xcolor for syntax coloring)\n"
    "Refs: hyperref, url (bibliography: built-in thebibliography only)\n"
    "Design (posters/flyers/color-on-request): xcolor, tcolorbox, rotating,\n"
    "  marginnote, helvet\n\n"
    "CRITICAL COMPILE-SAFETY RULES:\n"
    "1. Text formatting: \\textbf{text}, \\textit{text}, \\underline{text}, \\texttt{text}\n"
    "2. Lists: itemize/enumerate (max 3 levels, properly nested)\n"
    "3. MATH MODE IS MANDATORY for ALL math. A bare _ or ^ or math symbol in plain\n"
    "   text causes 'Missing $ inserted' and breaks the ENTIRE document. Always wrap:\n"
    "   subscripts/superscripts ($R_a$, $R_z$, $x^2$), variables, Greek letters,\n"
    "   and operators/symbols ($\\approx$, $\\rightarrow$, $\\pm$, $\\times$, $\\leq$)\n"
    "   in $...$ - never write R_a, x^2, alpha, ->, or a raw _ in running text.\n"
    "4. Tables: tabular/tabularx with booktabs rules and matching & / \\\\ counts\n"
    "5. Escape special chars in text: \\%, \\&, \\#, \\$, \\_, \\{, \\}\n"
    "6. NEVER use \\justify or \\Justifying - use \\raggedright or \\centering\n"
    "7. Use UTF-8; prefer straight quotes and -- / --- over unicode dashes\n"
    "8. Build on conversation history; for edits, change only what was asked and\n"
    "   preserve the rest of the structure\n\n"
    "UPLOADED DATA FILES:\n"
    "When the request includes a 'Data file' block (columns, statistics, sample rows),\n"
    "the document MUST be built from that real data:\n"
    "- Present the data (or a representative subset) in booktabs tables\n"
    "- Plot numeric relationships with pgfplots: \\usepackage{pgfplots},\n"
    "  \\pgfplotsset{compat=1.18}, then \\begin{tikzpicture}\\begin{axis}[...]\n"
    "  \\addplot table [col sep=comma, x=<col>, y=<col>] {\n"
    "  <paste the sample CSV rows inline here>\n"
    "  };\\end{axis}\\end{tikzpicture}\n"
    "- Label axes with the actual column names and units if evident\n"
    "- Compute derived values (means, slopes, maxima) ONLY from the provided\n"
    "  statistics or sample rows - NEVER invent data points\n"
    "- If the sample is truncated, say so in a table caption (e.g. 'first 20 of N rows')\n\n"
    "CLEAN DEFAULT TEMPLATE (follow this shape for papers/reports/articles):\n"
    "\\documentclass[11pt]{article}\n"
    "\\usepackage[utf8]{inputenc}\n"
    "\\usepackage[T1]{fontenc}\n"
    "\\usepackage{amsmath, amssymb, amsthm}\n"
    "\\usepackage{booktabs}\n"
    "\\usepackage{graphicx}\n"
    "\\usepackage[margin=1in]{geometry}\n"
    "\\usepackage{hyperref}\n"
    "\\usepackage{fancyhdr}\n"
    "\\pagestyle{fancy}\\fancyhf{}\\fancyhead[L]{\\small Document Title}\\fancyfoot[C]{\\thepage}\n"
    "\\title{Document Title}\n"
    "\\author{Author Name}\n"
    "\\date{\\today}\n"
    "\\begin{document}\n"
    "\\maketitle\n"
    "\\begin{abstract}\nOne concise paragraph summarising the document.\n\\end{abstract}\n"
    "\\tableofcontents\n"
    "\\newpage\n"
    "\\section{Introduction}\n"
    "Substantial, real content with subsections, tables, and numbered equations.\n"
    "\\end{document}"
)

# Enhanced fix system with better error categorization
_FIX_SYSTEM = (
    "You are an advanced LaTeX error fixer with comprehensive error recovery.\n"
    "You will receive LaTeX code and error details. Analyze and fix intelligently.\n"
    "Return ONLY the corrected LaTeX code - no explanations, no markdown fences.\n\n"
    "ERROR CLASSIFICATION AND FIXES:\n"
    "1. MISSING PACKAGES: Add \\usepackage{...} after \\documentclass\n"
    "2. ENCODING ERRORS: Fix special characters, use UTF-8 compatible alternatives\n"
    "3. MATH ERRORS: Ensure proper math mode, fix amsmath syntax\n"
    "4. TABLE ERRORS: Fix column alignment, check & separators and \\\\ endings\n"
    "5. FIGURE ERRORS: Ensure proper graphics inclusion and float positioning\n"
    "6. SYNTAX ERRORS: Balance braces {}, fix undefined commands\n"
    "7. FONT ERRORS: Remove problematic font packages, use fallbacks\n\n"
    "INTELLIGENT RECOVERY STRATEGIES:\n"
    "- Replace problematic UTF-8 chars: curly quotes to straight quotes, em/en dashes to hyphens\n"
    "- Remove T1 fontenc if causing font issues\n"
    "- Add missing math packages for equations\n"
    "- Fix table structure and booktabs usage\n"
    "- Escape special characters properly\n"
    "- Use standard document classes if custom ones fail\n\n"
    "CRITICAL RULES:\n"
    "1. PRESERVE STRUCTURE: Only fix the specific error, keep rest intact\n"
    "2. ADD MISSING PACKAGES: Insert \\usepackage{...} where needed\n"
    "3. MAINTAIN COMPATIBILITY: Ensure fixes work across LaTeX engines\n"
    "4. CONSERVATIVE CHANGES: Minimal modifications to achieve compilation\n"
    "5. PROPER ENCODING: Handle international characters correctly\n"
    "6. BALANCED SYNTAX: Ensure all braces, brackets, environments are closed\n"
    "7. NO EXPERIMENTAL FEATURES: Stick to well-supported LaTeX features\n"
    "8. ERROR-SPECIFIC FIXES: Target the exact issue mentioned in error log\n"
    "9. FALLBACK COMPATIBILITY: Ensure code works with basic LaTeX distributions\n"
    "10. INCREMENTAL FIXES: Make one targeted fix at a time"
)


def _clean(text: str) -> str:
    """Enhanced text cleaning with robust sanitization."""
    # Remove code fences
    cleaned = re.sub(
        r"^```(?:latex)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE
    ).strip()

    # Remove problematic justify commands
    cleaned = re.sub(r"\\justify\b", "", cleaned)
    cleaned = re.sub(r"\\Justifying\b", "", cleaned)
    cleaned = re.sub(r"\bJustifying\b", "", cleaned)

    # Clean up excessive whitespace
    cleaned = re.sub(r"\n\n\n+", "\n\n", cleaned)
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)

    # Fix common encoding issues
    char_fixes = {
        """: "``",
        """: "''",
        "'": "`",
        "'": "'",
        "–": "--",
        "—": "---",
        "…": "\\ldots",
        "©": "\\copyright",
        "®": "\\textregistered",
        "™": "\\texttrademark",
    }

    for old_char, new_char in char_fixes.items():
        cleaned = cleaned.replace(old_char, new_char)

    return cleaned.strip()


def generate_node(state: LatexAgentState) -> LatexAgentState:
    """Enhanced generation node with better error handling."""
    try:
        response = _llm.invoke(
            [
                SystemMessage(content=_GENERATE_SYSTEM),
                HumanMessage(content=state["prompt"]),
            ]
        )
        latex = _clean(str(response.content))
        print(f"[INFO] Generated LaTeX document ({len(latex)} characters)")
        return {**state, "latex": latex, "status": "compiling"}
    except Exception as e:
        print(f"[ERROR] Generation failed: {e}")
        return {**state, "error": f"Generation failed: {e}", "status": "error"}


def compile_node(state: LatexAgentState) -> LatexAgentState:
    """Enhanced compilation node with robust engine handling."""
    print(f"[INFO] Compiling LaTeX (attempt {state['retries'] + 1})...")

    try:
        result = compile_latex_tool.invoke({"latex": state["latex"]})
        if result["success"]:
            print(
                f"[SUCCESS] Compilation successful: {result.get('pdf_path', 'PDF generated')}"
            )
            return {
                **state,
                "pdf_path": result["pdf_path"],
                "error": "",
                "status": "done",
            }
        else:
            print(f"[ERROR] Compilation failed: {result.get('error', 'Unknown error')}")
            return {**state, "error": result["error"], "status": "fixing"}
    except Exception as e:
        print(f"[ERROR] Compilation exception: {e}")
        return {**state, "error": str(e), "status": "fixing"}


def fix_node(state: LatexAgentState) -> LatexAgentState:
    """Enhanced fix node with exponential backoff and intelligent recovery."""
    retry_count = state["retries"]

    # Exponential backoff delay (but cap it reasonably)
    if retry_count > 0:
        delay = min(math.pow(1.5, retry_count - 1), 10)  # Max 10 seconds
        print(f"[INFO] Applying exponential backoff: {delay:.1f}s delay")
        time.sleep(delay)

    print(f"[INFO] Attempting fix #{retry_count + 1}...")

    try:
        # Enhanced error context for better fixes
        error_context = (
            f"ATTEMPT #{retry_count + 1} OF MAXIMUM RETRIES\n"
            f"PREVIOUS ERROR: {state['error']}\n\n"
            f"LATEX CODE TO FIX:\n{state['latex']}\n\n"
            f"INSTRUCTIONS: Fix the specific error above. "
            f"If this is a package issue, add missing packages. "
            f"If this is a syntax error, fix the syntax. "
            f"If this is an encoding issue, replace problematic characters."
        )

        response = _llm.invoke(
            [
                SystemMessage(content=_FIX_SYSTEM),
                HumanMessage(content=error_context),
            ]
        )

        fixed_latex = _clean(str(response.content))

        # Guard against a truncated fixer response - a doc without
        # \end{document} can never compile, so keep the previous code.
        if "\\end{document}" not in fixed_latex:
            print("[WARN] Fixer output truncated (missing \\end{document}) - keeping previous code")
            fixed_latex = _apply_fallback_fixes(state["latex"], state["error"])
        # Verify the fix actually changed something
        elif fixed_latex == state["latex"]:
            print(f"[WARN] Fix didn't change the code - applying fallback fixes")
            # Apply some common fallback fixes
            fixed_latex = _apply_fallback_fixes(state["latex"], state["error"])

        print(f"[SUCCESS] Applied fix #{retry_count + 1}")
        return {
            **state,
            "latex": fixed_latex,
            "retries": retry_count + 1,
            "status": "compiling",
        }

    except Exception as e:
        print(f"[ERROR] Fix generation failed: {e}")
        return {
            **state,
            "error": f"Fix generation failed: {e}",
            "retries": retry_count + 1,
            "status": "compiling",
        }


def _apply_fallback_fixes(latex_code: str, error: str) -> str:
    """Apply common fallback fixes when LLM doesn't change the code."""
    fixed = latex_code

    # Common fixes based on error patterns
    if "Package inputenc Error" in error:
        # Replace common problematic characters
        fixes = {""": "``", """: "''", "'": "`", "'": "'", "–": "--", "—": "---"}
        for old, new in fixes.items():
            fixed = fixed.replace(old, new)

    if "ecrm1000.tfm" in error or "font" in error.lower():
        # Remove T1 fontenc
        fixed = re.sub(r"\\usepackage\s*\[\s*T1\s*\]\s*\{\s*fontenc\s*\}", "", fixed)

    if "undefined" in error.lower() and "tikz" in error.lower():
        # Add tikz package if missing
        if "\\usepackage{tikz}" not in fixed:
            fixed = re.sub(r"(\\documentclass.*?})", r"\1\n\\usepackage{tikz}", fixed)

    return fixed
