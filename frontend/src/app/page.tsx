"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

const PixelBlast = dynamic(() => import("@/components/PixelBlast"), { ssr: false });

/** Landing page: mirrors the dashboard hero. Logged-in users are redirected to
 *  /app; logged-out interactions route to /register (a typed prompt is stashed
 *  so the editor can pick it up after signup). */
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.push("/app");
    }
  }, [user, loading, router]);

  const goRegister = () => {
    if (prompt.trim()) {
      sessionStorage.setItem("pendingPrompt", prompt.trim());
    }
    router.push("/register");
  };

  if (loading) {
    return (
      <div className="theme-paper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "24px", height: "24px", border: "2px solid var(--border)", borderTop: "2px solid var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div
      className="theme-paper"
      style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "24px 24px 48px", position: "relative" }}
    >
      {/* animated pixel field backdrop (top area only) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "560px",
          maskImage: "radial-gradient(80% 70% at 50% 20%, #000 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(80% 70% at 50% 20%, #000 30%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 0,
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

      {/* Top-right sign in */}
      <div style={{ position: "absolute", top: "20px", right: "28px", zIndex: 50 }}>
        <Link href="/login" className="pill-btn" style={{ padding: "8px 20px", fontSize: "13px", background: "var(--bg-surface)" }}>
          Sign in
        </Link>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "760px", margin: "0 auto", textAlign: "center", paddingTop: "40px" }}>
        {/* Centered brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "28px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "6px", background: "#3a3226", flexShrink: 0 }}>
            <img src="/logo.png" alt="Particl" style={{ width: "78%", height: "78%", objectFit: "contain" }} />
          </span>
          <span className="px-font" style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.04em", color: "var(--text-primary)" }}>
            Particl
          </span>
        </div>

        <h1 style={{ fontSize: "44px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.15, marginBottom: "8px" }}>
          Documents that write,
          <br />
          <em style={{ color: "var(--accent)" }}>themselves.</em>
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "36px" }}>
          The intelligent LaTeX companion that understands your research.
          <br />
          Upload a dataset or describe what you need to get started.
        </p>

        {/* Dropzone (routes to register) */}
        <div
          onClick={goRegister}
          style={{
            border: "2px dashed var(--border)",
            borderRadius: "12px",
            padding: "36px 20px",
            background: "var(--bg-surface)",
            cursor: "pointer",
            transition: "all 0.15s ease",
            marginBottom: "20px",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: "10px" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
            Drop your data, image or reference paper files here
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            or click to browse (.csv, .png, .jpg, .pdf)
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
            color: "var(--text-muted)",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <span style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          describe what you need
          <span style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* Prompt input (routes to register, carrying the prompt) */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            background: "var(--bg-surface)",
            padding: "6px 6px 6px 16px",
          }}
        >
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                goRegister();
              }
            }}
            placeholder="Describe what you want to create..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: "14px",
              padding: "10px 0",
            }}
          />
          <button
            onClick={goRegister}
            aria-label="Get started"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              border: "none",
              background: prompt.trim() ? "var(--accent)" : "var(--bg-elevated)",
              color: prompt.trim() ? "#fff" : "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </div>

        <div style={{ display: "flex", gap: "14px", justifyContent: "center", marginTop: "32px" }}>
          <Link href="/register" className="pill-btn pill-btn-primary" style={{ padding: "12px 28px", fontSize: "14px" }}>
            Get started&nbsp;&rsaquo;
          </Link>
        </div>
      </div>
    </div>
  );
}
