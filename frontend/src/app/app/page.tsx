"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { api, UploadedFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { setSessionData, clearNewSessionRequest, clearSessionContent } from "@/lib/session-storage";

// pdf.js touches browser globals — render client-side only
const PdfThumbnail = dynamic(() => import("@/components/PdfThumbnail"), { ssr: false });
const PixelBlast = dynamic(() => import("@/components/PixelBlast"), { ssr: false });

type Conversation = {
  id: string;
  title: string | null;
  prompt: string;
  pdf_url: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
};

export default function AppDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<Conversation[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSignOut = async () => {
    setProfileOpen(false);
    try {
      await logout();
    } finally {
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    api.conversations
      .list()
      .then((convs: Conversation[]) => setProjects(convs.slice(0, 8)))
      .catch(() => {});
  }, []);

  const uploadFiles = async (files: FileList | File[]) => {
    const csvFiles = Array.from(files).filter((f) =>
      f.name.toLowerCase().endsWith(".csv")
    );
    if (csvFiles.length === 0) {
      setError("Only .csv data files are supported right now");
      return;
    }
    setIsUploading(true);
    setError("");
    try {
      for (const file of csvFiles) {
        const uploaded = await api.files.upload(file);
        setAttachedFiles((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "File upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const startProject = () => {
    if (!prompt.trim() || isUploading) return;
    // Hand off to the editor, which auto-starts generation
    sessionStorage.setItem("pendingPrompt", prompt.trim());
    if (attachedFiles.length > 0) {
      sessionStorage.setItem("pendingFiles", JSON.stringify(attachedFiles));
    }
    clearSessionContent();
    clearNewSessionRequest();
    router.push("/app/editor");
  };

  const openProject = (conv: Conversation) => {
    setSessionData({ conversationId: conv.id });
    clearNewSessionRequest();
    router.push("/app/editor");
  };

  const deleteProject = async (conv: Conversation) => {
    if (!window.confirm(`Delete "${conv.title || "this project"}"? This cannot be undone.`)) return;
    const prev = projects;
    setProjects((cur) => cur.filter((c) => c.id !== conv.id));
    try {
      await api.conversations.delete(conv.id);
    } catch {
      setProjects(prev); // restore on failure
      setError("Failed to delete project");
    }
  };

  return (
    <div
      className="theme-paper"
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        padding: "24px 24px 48px",
        position: "relative",
      }}
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

      {/* Top-right profile (same as editor) */}
      <div style={{ position: "absolute", top: "20px", right: "28px", zIndex: 50 }}>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            title={user?.email}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "4px 6px",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            <span style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text-primary)",
              maxWidth: "140px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {user?.email?.split("@")[0]}
            </span>
          </button>
          {profileOpen && (
            <div style={{
              position: "absolute",
              top: "36px",
              right: 0,
              minWidth: "220px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              zIndex: 60,
              overflow: "hidden",
            }}>
              <div style={{
                padding: "10px 14px",
                fontSize: "12px",
                color: "var(--text-primary)",
                borderBottom: "1px solid var(--border)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {user?.email}
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "10px 14px",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "760px", margin: "0 auto", textAlign: "center", paddingTop: "40px" }}>
        {/* Centered brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "28px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "6px", background: "#3a3226", flexShrink: 0 }}><img src="/logo.png" alt="Particl" style={{ width: "78%", height: "78%", objectFit: "contain" }} /></span>
          <span className="px-font" style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.04em", color: "var(--text-primary)" }}>
            Particl
          </span>
        </div>
        <h1
          style={{
            fontSize: "44px",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.15,
            marginBottom: "8px",
          }}
        >
          Documents that write,
          <br />
          <em style={{ color: "var(--accent)" }}>themselves.</em>
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "36px" }}>
          The intelligent LaTeX companion that understands your data.
          <br />
          Upload a dataset or describe what you need to get started.
        </p>

        {/* Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
          }}
          style={{
            border: isDragOver
              ? "2px dashed var(--accent)"
              : "2px dashed var(--border)",
            borderRadius: "12px",
            padding: "36px 20px",
            background: isDragOver ? "var(--bg-elevated)" : "var(--bg-surface)",
            cursor: "pointer",
            transition: "all 0.15s ease",
            marginBottom: "20px",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                uploadFiles(e.target.files);
                e.target.value = "";
              }
            }}
          />
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1.5"
            style={{ marginBottom: "10px" }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
            {isUploading ? "Uploading..." : "Drop your data files here"}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            or click to browse (.csv)
          </p>
          {attachedFiles.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                justifyContent: "center",
                marginTop: "14px",
              }}
            >
              {attachedFiles.map((f) => (
                <span
                  key={f.file_id}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-base)",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                  }}
                >
                  {f.filename}
                  <button
                    onClick={() =>
                      setAttachedFiles((prev) =>
                        prev.filter((x) => x.file_id !== f.file_id)
                      )
                    }
                    aria-label={`Remove ${f.filename}`}
                    style={{
                      border: "none",
                      background: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
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

        {/* Prompt input */}
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
                startProject();
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
            onClick={startProject}
            disabled={!prompt.trim() || isUploading}
            aria-label="Create document"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              border: "none",
              background: prompt.trim() && !isUploading ? "var(--accent)" : "var(--bg-elevated)",
              color: prompt.trim() && !isUploading ? "#fff" : "var(--text-muted)",
              cursor: prompt.trim() && !isUploading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </div>

        {error && (
          <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "10px" }}>{error}</p>
        )}
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <div style={{ position: "relative", zIndex: 1, maxWidth: "1080px", margin: "56px auto 0" }}>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "16px",
            }}
          >
            Your Projects
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              gap: "24px",
            }}
          >
            {projects.map((p) => (
              <div key={p.id} className="project-card" onClick={() => openProject(p)}>
                <div className="project-card__preview">
                  {p.pdf_url ? (
                    <PdfThumbnail url={p.pdf_url} />
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--bg-elevated)",
                      }}
                    >
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    </div>
                  )}
                  <button
                    className="project-card__delete"
                    title="Delete project"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(p);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
                <p className="project-card__label">
                  {p.title || `Project ${new Date(p.updated_at || p.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .project-card {
          cursor: pointer;
          transition: transform 0.18s ease;
        }
        .project-card:hover {
          transform: translateY(-4px) scale(1.02);
        }
        .project-card__preview {
          position: relative;
          aspect-ratio: 210 / 297;
          background: white;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
          transition: box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .project-card:hover .project-card__preview {
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
          border-color: var(--accent);
        }
        .project-card__delete {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          background: rgba(12, 12, 14, 0.7);
          backdrop-filter: blur(4px);
          color: var(--error);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.18s ease;
        }
        .project-card:hover .project-card__delete {
          opacity: 1;
        }
        .project-card__label {
          margin-top: 14px;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
