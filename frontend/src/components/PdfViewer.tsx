"use client";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
}

const ZOOM_LEVELS = [0.5, 0.65, 0.78, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];

export default function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [zoomIdx, setZoomIdx] = useState(3); // 90%
  const zoom = ZOOM_LEVELS[zoomIdx];

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
