"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const USE_CASES = [
  {
    id: "undergrad",
    label: "Undergrad",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10 12 5 2 10l10 5 10-5z" />
        <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
      </svg>
    ),
  },
  {
    id: "postgrad",
    label: "Postgrad",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 21v-4h6v4" />
        <path d="M10 10h.01M14 10h.01M10 14h.01M14 14h.01" />
      </svg>
    ),
  },
  {
    id: "research",
    label: "Research",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v3M12 3l2 1M5 8l1.5 2.5M19 8l-1.5 2.5" />
        <path d="M9 21l3-8 3 8" />
        <path d="M7.5 17.5h9" />
      </svg>
    ),
  },
  {
    id: "teaching",
    label: "Teaching",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6c-1.5-1.3-3.5-2-6-2H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2c2.5 0 4.5.7 6 2 1.5-1.3 3.5-2 6-2h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2c-2.5 0-4.5.7-6 2z" />
        <path d="M12 6v14" />
      </svg>
    ),
  },
  {
    id: "business",
    label: "Business",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 12h18" />
      </svg>
    ),
  },
  {
    id: "other",
    label: "Other",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="6" cy="12" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="18" cy="12" r="1.6" />
      </svg>
    ),
  },
];

const SOURCES = [
  {
    id: "twitter",
    label: "Twitter",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 5.9a8.4 8.4 0 0 1-2.4.7 4.2 4.2 0 0 0 1.9-2.3c-.8.5-1.7.8-2.7 1a4.2 4.2 0 0 0-7.2 3.8A12 12 0 0 1 3 4.7a4.2 4.2 0 0 0 1.3 5.6c-.7 0-1.3-.2-1.9-.5a4.2 4.2 0 0 0 3.4 4.2c-.6.2-1.3.2-1.9.1a4.2 4.2 0 0 0 3.9 2.9A8.5 8.5 0 0 1 2 18.6a12 12 0 0 0 6.3 1.8c7.5 0 11.7-6.3 11.4-11.9.8-.6 1.5-1.3 2.3-2.6z" />
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "reddit",
    label: "Reddit",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z" />
      </svg>
    ),
  },
  {
    id: "friend",
    label: "Friend",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
        <path d="M16.5 4.6a3.2 3.2 0 0 1 0 6.8" />
        <path d="M17.8 14.2a6.2 6.2 0 0 1 3.9 5.8" />
      </svg>
    ),
  },
  {
    id: "search",
    label: "Search",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    ),
  },
  {
    id: "other",
    label: "Other",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="6" cy="12" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="18" cy="12" r="1.6" />
      </svg>
    ),
  },
];

function Logo({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="Simpleton"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${Math.max(6, size * 0.19)}px`,
        objectFit: "cover",
        flexShrink: 0,
        display: "block",
      }}
    />
  );
}

function OptionCard({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "28px 12px",
        borderRadius: "10px",
        border: selected ? "1.5px solid var(--accent)" : "1px solid var(--border)",
        background: selected ? "var(--accent-dim)" : "var(--bg-surface)",
        color: selected ? "var(--accent-deep)" : "var(--text-secondary)",
        cursor: "pointer",
        transition: "border-color 0.15s ease, background 0.15s ease, transform 0.15s ease",
      }}
    >
      {selected && (
        <span
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "var(--accent)",
          }}
        />
      )}
      {icon}
      <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>{label}</span>
    </button>
  );
}

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [useCase, setUseCase] = useState("");
  const [useCaseOther, setUseCaseOther] = useState("");
  const [source, setSource] = useState("");
  const [sourceOther, setSourceOther] = useState("");

  const storageKey = user ? `particl_onboarded:${user.id}` : null;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.onboarding || (storageKey && localStorage.getItem(storageKey))) {
      router.replace("/app");
    }
  }, [loading, user, storageKey, router]);

  useEffect(() => {
    if (step !== 3 || !storageKey) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        useCase,
        useCaseDetail: useCase === "other" ? useCaseOther : "",
        source,
        sourceDetail: source === "other" ? sourceOther : "",
        completedAt: new Date().toISOString(),
      })
    );
    // Persist to the database; redirect regardless so a failure never traps the user
    api.auth
      .saveOnboarding({
        use_case: useCase,
        use_case_detail: useCase === "other" ? useCaseOther : "",
        source,
        source_detail: source === "other" ? sourceOther : "",
      })
      .catch(() => {});
    const t = setTimeout(() => router.replace("/app"), 1800);
    return () => clearTimeout(t);
  }, [step, storageKey, useCase, useCaseOther, source, sourceOther, router]);

  if (loading || !user) return null;

  return (
    <div
      className="theme-paper"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-base)" }}
    >
      {/* Top bar: logo + progress */}
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div>
          <Logo size={30} />
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              style={{
                width: "44px",
                height: "4px",
                borderRadius: "2px",
                background: i <= step ? "var(--accent-deep)" : "var(--accent-light)",
                opacity: i <= step ? 1 : 0.45,
                transition: "background 0.3s ease, opacity 0.3s ease",
              }}
            />
          ))}
        </div>
        <div />
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        {step === 0 && (
          <div
            onClick={() => setStep(1)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              cursor: "pointer",
              userSelect: "none",
              animation: "fadeUp 0.5s ease",
              paddingBottom: "8vh",
            }}
          >
            <Logo size={72} />
            <p style={{ marginTop: "44px", fontSize: "20px", color: "var(--text-secondary)" }}>Welcome to</p>
            <h1 className="px-font" style={{ fontSize: "56px", fontWeight: 700, color: "var(--text-primary)", marginTop: "6px" }}>
              Simpleton
            </h1>
            <p
              style={{
                marginTop: "18vh",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--accent)",
              }}
            >
              Click to continue
            </p>
          </div>
        )}

        {step === 1 && (
          <div style={{ width: "100%", maxWidth: "500px", animation: "fadeUp 0.4s ease", paddingBottom: "8vh" }}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                What are you using Simpleton for?
              </h1>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                Help us understand how you plan to use Simpleton
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
              {USE_CASES.map((c) => (
                <OptionCard
                  key={c.id}
                  label={c.label}
                  icon={c.icon}
                  selected={useCase === c.id}
                  onClick={() => setUseCase(c.id)}
                />
              ))}
            </div>
            {useCase === "other" && (
              <input
                type="text"
                value={useCaseOther}
                onChange={(e) => setUseCaseOther(e.target.value)}
                placeholder="Tell us what you'll use Simpleton for"
                autoFocus
                style={{
                  width: "100%",
                  marginTop: "16px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--accent)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            )}
            <button
              type="button"
              disabled={!useCase}
              onClick={() => setStep(2)}
              style={{
                width: "100%",
                marginTop: "28px",
                padding: "13px",
                borderRadius: "8px",
                border: "none",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-on-accent)",
                background: useCase ? "var(--accent)" : "var(--accent-light)",
                opacity: useCase ? 1 : 0.7,
                cursor: useCase ? "pointer" : "not-allowed",
                transition: "background 0.2s ease, opacity 0.2s ease",
              }}
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ width: "100%", maxWidth: "500px", animation: "fadeUp 0.4s ease", paddingBottom: "8vh" }}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                How did you find out about Simpleton?
              </h1>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                We&apos;d love to know how you discovered us
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
              {SOURCES.map((s) => (
                <OptionCard
                  key={s.id}
                  label={s.label}
                  icon={s.icon}
                  selected={source === s.id}
                  onClick={() => setSource(s.id)}
                />
              ))}
            </div>
            {source === "other" && (
              <input
                type="text"
                value={sourceOther}
                onChange={(e) => setSourceOther(e.target.value)}
                placeholder="Tell us how you found us"
                autoFocus
                style={{
                  width: "100%",
                  marginTop: "16px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--accent)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            )}
            <button
              type="button"
              disabled={!source}
              onClick={() => setStep(3)}
              style={{
                width: "100%",
                marginTop: "28px",
                padding: "13px",
                borderRadius: "8px",
                border: "none",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-on-accent)",
                background: source ? "var(--accent)" : "var(--accent-light)",
                opacity: source ? 1 : 0.7,
                cursor: source ? "pointer" : "not-allowed",
                transition: "background 0.2s ease, opacity 0.2s ease",
              }}
            >
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              animation: "fadeUp 0.4s ease",
              paddingBottom: "8vh",
            }}
          >
            <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 12a9.5 9.5 0 1 1-4.8-8.2" />
              <path d="M9 11.5l3 3 9-9" />
            </svg>
            <h1 style={{ fontSize: "30px", fontWeight: 700, color: "var(--text-primary)", marginTop: "28px" }}>
              You&apos;re all set!
            </h1>
            <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginTop: "10px" }}>
              Your Simpleton account is ready to go.
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "28px" }}>Redirecting you...</p>
          </div>
        )}
      </main>
    </div>
  );
}
