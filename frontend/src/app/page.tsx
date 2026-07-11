"use client";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import StorySection from "@/components/StorySection";

const PixelBlast = dynamic(() => import("@/components/PixelBlast"), { ssr: false });

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: "Natural language",
    description: "Describe your document in plain English. The AI understands your intent and writes properly formatted LaTeX.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Real-time streaming",
    description: "Watch the LaTeX appear character by character, then compile to a polished PDF right beside it.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    title: "Self-correcting",
    description: "Compilation errors? The agent reads the log, fixes the LaTeX, and retries automatically until it builds.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 15h6M9 11h6" />
      </svg>
    ),
    title: "Data to document",
    description: "Drop in a CSV and the agent builds tables and charts from your real data — no plotting by hand.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Session history",
    description: "Every project is saved. Pick up where you left off, revisit past documents, or start fresh anytime.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    title: "Instant export",
    description: "Download your compiled PDF or the raw .tex. Share it, print it, submit it — ready to go.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/app");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="theme-paper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "24px", height: "24px", border: "2px solid var(--border)", borderTop: "2px solid var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const Logo = ({ size = 28 }: { size?: number }) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "6px",
        background: "#3a3226",
        flexShrink: 0,
      }}
    >
      <img src="/logo.png" alt="Particl" style={{ width: "78%", height: "78%", objectFit: "contain" }} />
    </span>
  );

  return (
    <div className="theme-paper" style={{ minHeight: "100vh" }}>
      {/* ── Nav pill ── */}
      <nav style={{ position: "fixed", top: "18px", left: "50%", transform: "translateX(-50%)", zIndex: 100, width: "min(1040px, calc(100% - 32px))" }}>
        <div className="nav-pill">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Logo size={24} />
            <span className="px-font" style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>Particl</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
            <Link href="/login" className="pill-btn pill-btn-primary">
              Sign in&nbsp;&rsaquo;
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: "relative", paddingTop: "168px", paddingBottom: "72px", textAlign: "center", overflow: "hidden" }}>
        {/* animated pixel field backdrop */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            maskImage: "radial-gradient(70% 60% at 50% 30%, #000 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(70% 60% at 50% 30%, #000 40%, transparent 100%)",
            pointerEvents: "none",
          }}
        >
          <PixelBlast
            variant="square"
            pixelSize={4}
            color="#bfa980"
            patternScale={2}
            patternDensity={1}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            speed={0.5}
            edgeFade={0.25}
            transparent
          />
        </div>
        <div style={{ position: "relative", maxWidth: "760px", margin: "0 auto", padding: "0 24px" }}>
          <p style={{ fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-deep)", marginBottom: "22px" }}>
            AI-powered LaTeX, done for you
          </p>
          <h1 style={{ fontSize: "clamp(38px, 6vw, 62px)", fontWeight: 700, lineHeight: 1.08, color: "var(--text-primary)", marginBottom: "22px" }}>
            Describe a document.
            <br />
            <span style={{ color: "var(--accent)" }}>Watch it appear.</span>
          </h1>
          <p style={{ fontSize: "17px", lineHeight: 1.7, color: "var(--text-secondary)", maxWidth: "540px", margin: "0 auto 40px" }}>
            Tell the agent what you need in plain English or drop in your data.
            <br />
            It writes, compiles, and fixes the LaTeX — you get a finished PDF.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="pill-btn pill-btn-primary" style={{ padding: "13px 30px", fontSize: "14px" }}>
              Get started&nbsp;&rsaquo;
            </Link>
            <Link href="/login" className="pill-btn" style={{ padding: "13px 30px", fontSize: "14px", background: "var(--bg-surface)" }}>
              Sign in
            </Link>
          </div>
        </div>

        {/* ── Showcase: code panel with frosted overlay ── */}
        <div style={{ position: "relative", maxWidth: "900px", margin: "72px auto 0", padding: "0 24px" }}>
          <div className="soft-card" style={{ position: "relative", overflow: "hidden", padding: 0 }}>
            <div style={{ display: "flex", gap: "6px", padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", alignItems: "center" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#e5679b" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#e0b341" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#6fbf73" }} />
              <span style={{ marginLeft: "12px", fontSize: "12px", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>document.tex</span>
            </div>
            <div style={{ padding: "26px", textAlign: "left", background: "linear-gradient(160deg, #2b2417, #191309)" }}>
              <pre style={{ fontSize: "13px", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace", color: "#e6dcc6" }}>
                <span style={{ color: "#c9a86f" }}>% Describe your document</span>{"\n"}
                <span style={{ color: "#d8b57e" }}>\documentclass</span>{"{article}"}{"\n\n"}
                <span style={{ color: "#d8b57e" }}>\begin</span>{"{document}"}{"\n"}
                {"  "}<span style={{ color: "#d8b57e" }}>\section</span>{"{Introduction}"}{"\n\n"}
                <span style={{ color: "#b3a689" }}>{"  This is a generated LaTeX document..."}</span>{"\n\n"}
                <span style={{ color: "#d8b57e" }}>\end</span>{"{document}"}
              </pre>
            </div>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className="frosted" style={{ padding: "26px 44px", textAlign: "center", maxWidth: "420px" }}>
                <p className="px-font" style={{ fontSize: "clamp(17px,2.6vw,26px)", color: "#fff", lineHeight: 1.3 }}>
                  From words to PDF
                </p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.72)", marginTop: "10px", lineHeight: 1.6 }}>
                  The agent writes the LaTeX, compiles it, and self-corrects — all in one flow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "88px 24px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <h2 style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>
              Everything, handled
            </h2>
            <p style={{ fontSize: "16px", color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto" }}>
              Professional LaTeX documents without the learning curve.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "22px" }}>
            {features.map((f, i) => (
              <div key={i} className="soft-card" style={{ padding: "26px" }}>
                <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px", color: "var(--accent)" }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "9px" }}>{f.title}</h3>
                <p style={{ fontSize: "14px", lineHeight: 1.65, color: "var(--text-secondary)" }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Story timeline ── */}
      <StorySection />

      {/* ── Visualizations showcase ── */}
      <section style={{ padding: "48px 24px 80px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <p style={{ fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-deep)", marginBottom: "14px" }}>
              Visualizations
            </p>
            <h2 style={{ fontSize: "clamp(24px,3.6vw,34px)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px", lineHeight: 1.2 }}>
              Publication-grade figures from a sentence
            </h2>
            <p style={{ fontSize: "16px", lineHeight: 1.7, color: "var(--text-secondary)", maxWidth: "640px", margin: "0 auto" }}>
              3D surfaces, vector fields, and true statistical box plots — medians,
              quartiles, means, and outliers — typeset by the agent and compiled to
              vector-sharp PDF. This page came from a single prompt.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 4fr)", gap: "26px", alignItems: "center" }}>
            <div className="soft-card" style={{ padding: "18px", background: "#fdfaf2" }}>
              <img
                src="/viz-showcase.png"
                alt="Three figures generated by Particl: a 3D sine ribbon surface, a 3D vector field in a cube, and a statistical box plot with medians, means and outliers"
                style={{ width: "100%", height: "auto", display: "block", borderRadius: "8px" }}
              />
            </div>
            <div>
              <div className="soft-card" style={{ padding: "22px", marginBottom: "18px" }}>
                <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
                  The prompt
                </p>
                <p className="mono" style={{ fontSize: "13px", lineHeight: 1.7, color: "var(--text-primary)" }}>
                  &quot;A visual plots showcase: a 3D ribbon of sin(x), a vector field
                  inside a cube, and a box plot comparing outcomes across three test
                  cycles.&quot;
                </p>
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  "Box plots with real quartiles, whiskers, mean markers and outliers",
                  "3D surfaces and vector fields with sensible camera angles",
                  "Vector output — every figure stays sharp at any zoom",
                  "Refine any figure by talking to it",
                ].map((t) => (
                  <li key={t} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "14.5px", lineHeight: 1.55, color: "var(--text-secondary)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "3px" }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Vision ── */}
      <section style={{ padding: "40px 24px 72px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-deep)", marginBottom: "14px" }}>
            The vision
          </p>
          <h2 style={{ fontSize: "clamp(24px,3.6vw,34px)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "18px", lineHeight: 1.2 }}>
            Formatting shouldn&apos;t be the hard part
          </h2>
          <p style={{ fontSize: "17px", lineHeight: 1.75, color: "var(--text-secondary)" }}>
            We believe everyone should have access to professional-quality document
            formatting. Particl eliminates LaTeX as a barrier, letting researchers,
            students, and professionals focus on what matters — the content itself.
          </p>
        </div>
      </section>

      {/* ── Built for ── */}
      <section style={{ padding: "0 24px 88px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={{ fontSize: "clamp(24px,3.6vw,34px)", fontWeight: 700, color: "var(--text-primary)" }}>
              Built for
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "22px" }}>
            {[
              {
                title: "Researchers",
                body: "Academic papers, theses, grant proposals",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                ),
              },
              {
                title: "Students",
                body: "Dissertations, reports, assignments",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                ),
              },
              {
                title: "Professionals",
                body: "Resumes, technical docs, presentations",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                ),
              },
            ].map((g) => (
              <div key={g.title} className="soft-card" style={{ padding: "26px", textAlign: "center" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--accent-dim)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  {g.icon}
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>{g.title}</h3>
                <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--text-secondary)" }}>{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section style={{ padding: "20px 24px 100px", textAlign: "center" }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px,4.5vw,44px)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
            Ready to write?
          </h2>
          <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginBottom: "34px", lineHeight: 1.7 }}>
            Describe your first document and get a compiled PDF in seconds.
          </p>
          <Link href="/register" className="pill-btn pill-btn-primary" style={{ padding: "15px 40px", fontSize: "15px" }}>
            Get started&nbsp;&rsaquo;
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "32px 24px", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Logo size={20} />
            <span className="px-font" style={{ fontSize: "14px", color: "var(--text-primary)" }}>Particl</span>
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            AI-powered LaTeX document generation
          </span>
        </div>
      </footer>
    </div>
  );
}
