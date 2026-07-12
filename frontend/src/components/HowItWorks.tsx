"use client";
import { useEffect, useState } from "react";

/** Auto-cycling prompt -> document type -> compiled page strip. */
const EXAMPLES = [
  {
    id: "plots",
    label: "Plots & charts",
    sub: "pgfplots figures",
    accent: "#3f8f5f",
    tint: "rgba(63, 143, 95, 0.16)",
    prompt:
      "A visual plots showcase: a 3D ribbon of sin(x), a vector field inside a cube, and a box plot comparing outcomes across three test cycles.",
    img: "/viz-showcase.png",
  },
  {
    id: "diagrams",
    label: "Diagrams & circuits",
    sub: "TikZ + quantikz",
    accent: "#c9822d",
    tint: "rgba(201, 130, 45, 0.16)",
    prompt:
      "A diagrams sheet: a pie chart of the five V's of Big Data, a 4-qubit quantum circuit with measurements, and a transformer block diagram with a residual connection.",
    img: "/showcase-diagrams.png",
  },
  {
    id: "textbook",
    label: "Textbook chapter",
    sub: "objectives + figures",
    accent: "#c0503f",
    tint: "rgba(192, 80, 63, 0.16)",
    prompt:
      "A textbook lesson on the nature of light: numbered sections with objectives boxes, a worked example, and wave figures showing 700 nm and 400 nm light.",
    img: "/showcase-textbook.png",
  },
];

// Dots tracing a right-pointing arrow in a 24x24 viewBox
const ARROW_DOTS: [number, number][] = [
  // top of shaft
  [4, 9], [6.7, 9], [9.3, 9], [12, 9],
  // up to arrowhead top
  [12, 7], [12, 5],
  // upper diagonal to the tip
  [14, 6.75], [16, 8.5], [18, 10.25], [20, 12],
  // lower diagonal from the tip
  [18, 13.75], [16, 15.5], [14, 17.25], [12, 19],
  // up to shaft bottom
  [12, 17], [12, 15],
  // bottom of shaft
  [9.3, 15], [6.7, 15], [4, 15],
  // left edge
  [4, 13], [4, 11],
];

/** Dotted arrow that slides vertically to point at the active card.
 *  Card i center (3 equal cards, 18px gaps): (100%-36px)/3*i + 18px*i + (100%-36px)/6 */
function ArrowTrack({ color, active }: { color: string; active: number }) {
  const top = `calc(((100% - 36px) / 3) * ${active} + ${active * 18}px + (100% - 36px) / 6)`;
  return (
    <div style={{ position: "relative", alignSelf: "stretch" }}>
      <svg
        className="dot-arrow"
        width="74"
        height="74"
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: "50%",
          top,
          transform: "translate(-50%, -50%)",
          transition: "top 0.45s ease",
        }}
      >
        {ARROW_DOTS.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="1.15"
            fill={color}
            style={{
              transition: "fill 0.4s ease",
              animationDelay: `${(i * 80) % 720}ms`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export default function HowItWorks() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(t);
  }, []);

  const ex = EXAMPLES[active];

  return (
    <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
      {/* Column captions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.45fr 1fr", gap: "16px", marginBottom: "28px" }}>
        {[
          <span key="a"><strong className="px-font">Describe it</strong> in plain English — no LaTeX required.</span>,
          <span key="b" style={{ display: "block", padding: "0 90px" }}><strong className="px-font">The agent writes</strong> the LaTeX, compiles it, and fixes its own errors.</span>,
          <span key="c"><strong className="px-font">Download</strong> a finished, vector-sharp PDF.</span>,
        ].map((c, i) => (
          <p key={i} style={{ fontSize: "16px", lineHeight: 1.65, color: "var(--text-secondary)" }}>{c}</p>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.45fr 1fr", gap: "16px", alignItems: "center" }}>
        {/* Prompt card */}
        <div className="soft-card" style={{ padding: 0, overflow: "hidden", alignSelf: "stretch", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "11px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: ex.accent, transition: "background 0.4s ease" }} />
            <span className="mono" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>prompt</span>
          </div>
          <p key={ex.id} className="mono" style={{ padding: "26px", fontSize: "16px", lineHeight: 1.9, color: "var(--text-primary)", animation: "fadeUp 0.45s ease", margin: 0, flex: 1 }}>
            &quot;{ex.prompt}&quot;
          </p>
        </div>

        {/* Arrows + document type cards share one band so the arrows track the active card */}
        <div style={{ display: "grid", gridTemplateColumns: "74px 1fr 74px", gap: "16px", alignItems: "stretch" }}>
        <ArrowTrack color={ex.accent} active={active} />

        {/* Document type cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {EXAMPLES.map((e, i) => {
            const on = i === active;
            return (
              <button
                key={e.id}
                onClick={() => setActive(i)}
                style={{
                  textAlign: "left",
                  padding: "28px 24px",
                  borderRadius: "12px",
                  border: on ? `1px solid ${e.accent}` : "1px solid var(--border)",
                  background: on
                    ? `linear-gradient(100deg, ${e.tint}, var(--bg-surface))`
                    : "var(--bg-surface)",
                  cursor: "pointer",
                  transition: "background 0.4s ease, border-color 0.4s ease",
                }}
              >
                <span className="mono" style={{ display: "block", fontSize: "12.5px", color: on ? e.accent : "var(--text-muted)", marginBottom: "6px", transition: "color 0.4s ease" }}>
                  {e.sub}
                </span>
                <span style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)" }}>{e.label}</span>
              </button>
            );
          })}
        </div>

        <ArrowTrack color={ex.accent} active={active} />
        </div>

        {/* Compiled page */}
        <div
          style={{
            alignSelf: "stretch",
            borderRadius: "14px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px",
            minHeight: "500px",
          }}
        >
          <img
            key={ex.img}
            src={ex.img}
            alt={`Compiled PDF page: ${ex.label}`}
            style={{
              width: "95%",
              aspectRatio: "1275 / 1650",
              height: "auto",
              objectFit: "contain",
              display: "block",
              background: "#fff",
              padding: "8px 0",
              boxSizing: "border-box",
              boxShadow: "0 12px 36px rgba(0,0,0,0.2)",
              borderRadius: "3px",
              animation: "fadeUp 0.45s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
