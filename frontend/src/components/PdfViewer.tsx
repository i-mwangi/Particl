"use client";
import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  /** When true, snap zoom to 110% (used when the code pane is hidden). */
  focusZoom?: boolean;
}

const ZOOM_LEVELS = [0.5, 0.65, 0.78, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
const DEFAULT_IDX = 3; // 90%
const FOCUS_IDX = ZOOM_LEVELS.indexOf(1.1); // 110%

export default function PdfViewer({ url, focusZoom = false }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_IDX);
  const zoom = ZOOM_LEVELS[zoomIdx];

  // Entering focus mode zooms to 110%; leaving it returns to the default 90%.
  useEffect(() => {
    setZoomIdx(focusZoom ? FOCUS_IDX : DEFAULT_IDX);
  }, [focusZoom]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "var(--bg-base)",
        overflow: "auto",
      }}
    >
      <Document
        file={url}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        loading={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "200px",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            Rendering PDF…
          </div>
        }
        error={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "200px",
              color: "var(--error)",
              fontSize: "13px",
            }}
          >
            Could not render the PDF — use Export to download it.
          </div>
        }
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            padding: "24px 16px 72px",
          }}
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div
              key={i}
              style={{
                boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                borderRadius: "2px",
                overflow: "hidden",
                background: "white",
              }}
            >
              <Page
                pageNumber={i + 1}
                width={620 * zoom}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </div>
          ))}
        </div>
      </Document>

      {/* Zoom controls */}
      {numPages > 0 && (
        <div
          style={{
            position: "sticky",
            bottom: "16px",
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 10px",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              pointerEvents: "auto",
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            }}
          >
            <button
              onClick={() => setZoomIdx((z) => Math.max(0, z - 1))}
              disabled={zoomIdx === 0}
              aria-label="Zoom out"
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: "16px",
                cursor: zoomIdx === 0 ? "not-allowed" : "pointer",
              }}
            >
              −
            </button>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-primary)",
                minWidth: "44px",
                textAlign: "center",
              }}
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoomIdx((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
              disabled={zoomIdx === ZOOM_LEVELS.length - 1}
              aria-label="Zoom in"
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: "16px",
                cursor: zoomIdx === ZOOM_LEVELS.length - 1 ? "not-allowed" : "pointer",
              }}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
