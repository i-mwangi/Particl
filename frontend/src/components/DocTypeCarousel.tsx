"use client";
import { useEffect, useRef, useState } from "react";

/** Horizontal document-type carousel: the centered icon is highlighted with a
 *  tooltip; every few seconds the strip glides one item to the left. */

const TYPES: { t: string; d: string; img?: string; i?: React.ReactNode }[] = [
  { t: "Specifications", d: "Numbered requirements with clean, consistent typesetting", img: "/doc-specifications.png" },
  { t: "Reports", d: "Structured reports with tables and charts built from your data", img: "/doc-reports.png" },
  { t: "Theses", d: "Chapters, citations and figures that hold together", img: "/doc-theses.png" },
  { t: "Presentations", d: "Beamer slide decks — one idea per frame", img: "/doc-presentations.png" },
  { t: "Papers", d: "Abstract to bibliography in journal-ready form", img: "/doc-papers.png" },
  { t: "Lecture notes", d: "Complex equations and worked examples, typeset with ease", img: "/doc-lecture-notes.png" },
  { t: "Transactional documents", d: "Automate document creation through the API", img: "/doc-transactional.png" },
  { t: "Books", d: "Large works organized into chapters, formatted automatically", img: "/doc-books.png" },
  { t: "Curriculum Vitae", d: "Your experience as a polished one-page resume", img: "/doc-cv.png" },
  { t: "Letters", d: "Formal correspondence, opening to closing, in a minute", img: "/doc-letters.png" },
  { t: "Invoices", d: "Line items and totals from machine-readable data", img: "/doc-invoices.png" },
  { t: "Proposals", d: "Structured proposals with budgets and timelines", img: "/doc-proposals.png" },
];

const N = TYPES.length;
const SLOT = 172; // px between icon centers
const HOLD_MS = 6000; // pause on each item before gliding on
const GLIDE_MS = 900;

export default function DocTypeCarousel() {
  // The list is TRIPLED and pos lives in the middle copy [N, 2N), so icons
  // always extend past both edges of the viewport - including on first paint.
  // After gliding into the third copy we snap back a full cycle, invisibly.
  const [pos, setPos] = useState(N);
  const [animate, setAnimate] = useState(true);
  const snapTimer = useRef<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setPos((p) => p + 1);
    }, HOLD_MS);
    return () => clearInterval(t);
  }, []);

  // After gliding past the middle copy, snap back invisibly
  useEffect(() => {
    if (pos < 2 * N) return;
    snapTimer.current = window.setTimeout(() => {
      setAnimate(false);
      setPos(pos - N);
      window.setTimeout(() => setAnimate(true), 50);
    }, GLIDE_MS + 60);
    return () => {
      if (snapTimer.current) window.clearTimeout(snapTimer.current);
    };
  }, [pos]);

  const items = [...TYPES, ...TYPES, ...TYPES];
  const activeIdx = pos % N;
  const active = TYPES[activeIdx];

  return (
    <div style={{ overflow: "hidden", position: "relative", padding: "26px 0 8px" }}>
      {/* Icon strip: active item is centered via translate */}
      <div
        style={{
          display: "flex",
          transform: `translateX(calc(50% - ${SLOT / 2}px - ${pos * SLOT}px))`,
          transition: animate ? `transform ${GLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` : "none",
        }}
      >
        {items.map((x, i) => {
          const on = i === pos;
          return (
            <div
              key={i}
              style={{
                width: `${SLOT}px`,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "104px",
                  height: "104px",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: x.img ? "transparent" : on ? "var(--accent-dim)" : "transparent",
                  color: on ? "var(--accent-deep)" : "var(--text-muted)",
                  opacity: on ? 1 : 0.55,
                  transform: on ? "scale(1.22)" : "scale(1)",
                  transition: `transform ${GLIDE_MS}ms ease, background ${GLIDE_MS}ms ease, color ${GLIDE_MS}ms ease, opacity ${GLIDE_MS}ms ease`,
                }}
              >
                {x.img ? (
                  <img src={x.img} alt={x.t} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    {x.i}
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip under the centered icon */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "26px", minHeight: "96px" }}>
        <div key={active.t} style={{ position: "relative", animation: "fadeUp 0.5s ease" }}>
          <div
            style={{
              position: "absolute",
              top: "-7px",
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: "14px",
              height: "14px",
              background: "var(--bg-surface)",
              borderLeft: "1px solid var(--border)",
              borderTop: "1px solid var(--border)",
            }}
          />
          <div
            className="soft-card"
            style={{ padding: "16px 22px", maxWidth: "340px", textAlign: "left" }}
          >
            <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>{active.t}</p>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "var(--text-secondary)" }}>{active.d}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
