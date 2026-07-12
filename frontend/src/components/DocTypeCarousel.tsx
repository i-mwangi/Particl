"use client";
import { useEffect, useRef, useState } from "react";

/** Horizontal document-type carousel: the centered icon is highlighted with a
 *  tooltip; every few seconds the strip glides one item to the left. */

const TYPES = [
  { t: "Specifications", d: "Numbered requirements with clean, consistent typesetting", i: <><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></> },
  { t: "Reports", d: "Structured reports with tables and charts built from your data", i: <><path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="7" /><rect x="13" y="6" width="3" height="11" /></> },
  { t: "Theses", d: "Chapters, citations and figures that hold together", i: <><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" /></> },
  { t: "Presentations", d: "Beamer slide decks — one idea per frame", i: <><rect x="3" y="4" width="18" height="12" rx="1" /><path d="M12 16v4M8 20h8" /></> },
  { t: "Papers", d: "Abstract to bibliography in journal-ready form", i: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></> },
  { t: "Lecture notes", d: "Complex equations and worked examples, typeset with ease", i: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></> },
  { t: "Transactional documents", d: "Automate document creation through the API", i: <><path d="M16 3h5v5M8 21H3v-5" /><path d="M21 3l-7 7M3 21l7-7" /></> },
  { t: "Books", d: "Large works organized into chapters, formatted automatically", i: <><path d="M12 6c-1.5-1.3-3.5-2-6-2H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2c2.5 0 4.5.7 6 2 1.5-1.3 3.5-2 6-2h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2c-2.5 0-4.5.7-6 2z" /><path d="M12 6v14" /></> },
  { t: "Curriculum Vitae", d: "Your experience as a polished one-page resume", i: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></> },
  { t: "Letters", d: "Formal correspondence, opening to closing, in a minute", i: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 7l10 6 10-6" /></> },
  { t: "Invoices", d: "Line items and totals from machine-readable data", i: <><path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2 3-2V8z" /><path d="M9 9h6M9 13h6" /></> },
  { t: "Proposals", d: "Structured proposals with budgets and timelines", i: <><path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.6 6.5 19.5l1-6.3L3 8.9 9 8z" /></> },
];

const N = TYPES.length;
const SLOT = 172; // px between icon centers
const HOLD_MS = 6000; // pause on each item before gliding on
const GLIDE_MS = 900;

export default function DocTypeCarousel() {
  // pos runs 0..2N-1 over a doubled list; when it reaches N we snap back
  // (without transition) to the equivalent position in the first copy.
  const [pos, setPos] = useState(0);
  const [animate, setAnimate] = useState(true);
  const snapTimer = useRef<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setPos((p) => p + 1);
    }, HOLD_MS);
    return () => clearInterval(t);
  }, []);

  // After gliding onto the second copy, snap back invisibly
  useEffect(() => {
    if (pos < N) return;
    snapTimer.current = window.setTimeout(() => {
      setAnimate(false);
      setPos(pos - N);
      window.setTimeout(() => setAnimate(true), 50);
    }, GLIDE_MS + 60);
    return () => {
      if (snapTimer.current) window.clearTimeout(snapTimer.current);
    };
  }, [pos]);

  const items = [...TYPES, ...TYPES];
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
                  width: "84px",
                  height: "84px",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: on ? "var(--accent-dim)" : "transparent",
                  color: on ? "var(--accent-deep)" : "var(--text-muted)",
                  transform: on ? "scale(1.18)" : "scale(1)",
                  transition: `transform ${GLIDE_MS}ms ease, background ${GLIDE_MS}ms ease, color ${GLIDE_MS}ms ease`,
                }}
              >
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  {x.i}
                </svg>
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
