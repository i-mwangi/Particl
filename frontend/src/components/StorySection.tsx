"use client";
import { useEffect, useRef } from "react";

const BEATS = [
  {
    id: "hook",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
        <path d="M18 15l0.7 2L21 17.7l-2 0.7L18 20l-0.7-2L15 17.7l2-0.7z" />
      </svg>
    ),
    headline: "What if LaTeX wrote itself?",
    body: "No more wrestling with syntax, missing packages, or cryptic errors. Just describe the document you want.",
  },
  {
    id: "describe",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
      </svg>
    ),
    headline: "Describe it in plain English",
    body: "Tell the agent what you need — a resume, a lab report, a research paper — or drop in a dataset to work from.",
  },
  {
    id: "generate",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    headline: "Watch it write itself",
    body: "The LaTeX streams in character by character as the agent plans the structure and lays out every section.",
  },
  {
    id: "data",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="14" width="4" height="7" />
        <rect x="10" y="9" width="4" height="12" />
        <rect x="17" y="4" width="4" height="17" />
      </svg>
    ),
    headline: "Data becomes documents",
    body: "Upload a CSV and it builds clean tables and charts straight from your real numbers — never invented.",
  },
  {
    id: "fix",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    headline: "It fixes its own mistakes",
    body: "Compilation errors are read, corrected, and recompiled automatically — up to three times — until the PDF builds.",
  },
  {
    id: "refine",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    headline: "Refine by conversation",
    body: "Ask for changes in plain language, or edit the code directly. Recompile and see the result beside you instantly.",
  },
  {
    id: "export",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    headline: "Export and share",
    body: "Download the polished PDF or the raw .tex. Your document is ready to print, submit, or hand off.",
  },
];

export default function StorySection() {
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const beats = el.querySelectorAll<HTMLElement>(".ld-story-beat");
    if (!beats.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("ld-story-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    beats.forEach((b) => obs.observe(b));
    return () => obs.disconnect();
  }, []);

  return (
    <section style={{ padding: "40px 24px 96px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <p style={{ fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-deep)", marginBottom: "12px" }}>
            The story
          </p>
          <h2 style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 700, color: "var(--text-primary)" }}>
            From a sentence to a finished PDF
          </h2>
        </div>

        <div className="ld-story-timeline" ref={timelineRef}>
          {BEATS.map((beat, i) => (
            <div
              key={beat.id}
              className="ld-story-beat"
              style={{ ["--beat-delay" as string]: `${(i % 2) * 0.08}s` }}
            >
              <div className="ld-story-icon">{beat.icon}</div>
              <h3 className="ld-story-beat-headline">{beat.headline}</h3>
              <p className="ld-story-beat-body">{beat.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
