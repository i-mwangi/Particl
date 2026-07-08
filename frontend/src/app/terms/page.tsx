"use client";
import Link from "next/link";

export default function Terms() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 48px",
          background: "rgba(12, 12, 14, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "6px", background: "#3a3226", flexShrink: 0 }}><img src="/logo.png" alt="Particl" style={{ width: "78%", height: "78%", objectFit: "contain" }} /></span>
          <span style={{ fontSize: "17px", fontWeight: "600", color: "var(--text-primary)" }}>Particl</span>
        </Link>
      </header>

      <main style={{ flex: 1, paddingTop: "120px", paddingBottom: "80px" }}>
        <article style={{ maxWidth: "720px", margin: "0 auto", padding: "0 48px" }}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 36px)", fontWeight: "700", color: "var(--text-primary)", marginBottom: "16px" }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "48px" }}>
            Last updated: March 23, 2026
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "32px", color: "var(--text-secondary)", fontSize: "15px", lineHeight: "1.8" }}>
            <section>
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>Acceptance of Terms</h2>
              <p>By accessing or using Particl, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>Use of Service</h2>
              <p>Particl provides AI-powered LaTeX document generation. You agree to use the service for lawful purposes only and not to generate content that violates laws or regulations.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>Account Responsibility</h2>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>Service Availability</h2>
              <p>We strive to keep Particl available, but do not guarantee uninterrupted access. The service may be temporarily unavailable for maintenance or updates.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>Intellectual Property</h2>
              <p>Generated documents are yours. You retain full ownership of content created using Particl. We may use anonymized data to improve our service.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>Limitation of Liability</h2>
              <p>Particl is provided &quot;as is&quot; without warranties. We are not liable for any damages arising from use of the service.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>Changes to Terms</h2>
              <p>We may update these terms at any time. Continued use after changes constitutes acceptance of new terms.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>Contact</h2>
              <p>Questions about these terms? Reach out at support@particl.com</p>
            </section>
          </div>
        </article>
      </main>

      <footer style={{ padding: "32px 48px", borderTop: "1px solid var(--border-subtle)", textAlign: "center" }}>
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Particl - Built for professional document creation</p>
      </footer>
    </div>
  );
}
