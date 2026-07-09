"use client";
import { useEffect, useRef, useState } from "react";

export interface AgentMessage {
  id: number;
  role: "user" | "agent" | "tool";
  text: string;
}

interface AgentPanelProps {
  open: boolean;
  onToggle: (open: boolean) => void;
  messages: AgentMessage[];
  isBusy: boolean;
  onSend: (text: string) => void;
}

/** Optional document features the user can tick; unticked = agent decides. */
const DOC_FEATURES = [
  { id: "tables", label: "Tables", hint: "professional booktabs tables" },
  { id: "charts", label: "Charts & box plots", hint: "pgfplots charts (box plots where statistics fit)" },
  { id: "diagrams", label: "Diagrams", hint: "TikZ diagrams" },
  { id: "gantt", label: "Gantt timeline", hint: "a pgfgantt project timeline" },
  { id: "equations", label: "Numbered equations", hint: "numbered amsmath equations" },
  { id: "code", label: "Code listings", hint: "syntax-highlighted code listings" },
  { id: "bibliography", label: "Bibliography", hint: "a bibliography with \\cite citations" },
  { id: "color", label: "Color accents", hint: "tasteful color accents (xcolor)" },
  { id: "poster", label: "Poster-style design", hint: "a designed one-page poster/flyer layout with bold color blocks" },
];

/** Render **bold** spans inside a line of message text */
function renderRichText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/** Render a message body: paragraphs, numbered points and bullets */
function renderMessageBody(text: string) {
  return text.split("\n").map((line, key) => {
    const numbered = line.match(/^(\d+)\.\s+(.*)$/);
    if (numbered) {
      return (
        <div key={key} style={{ display: "flex", gap: "6px", margin: "3px 0" }}>
          <span style={{ fontWeight: 600, flexShrink: 0 }}>{numbered[1]}.</span>
          <span>{renderRichText(numbered[2])}</span>
        </div>
      );
    }
    const bullet = line.match(/^\s*[•\-]\s+(.*)$/);
    if (bullet) {
      return (
        <div key={key} style={{ display: "flex", gap: "6px", margin: "2px 0", paddingLeft: "16px" }}>
          <span style={{ flexShrink: 0 }}>•</span>
          <span>{renderRichText(bullet[1])}</span>
        </div>
      );
    }
    if (line.trim() === "") {
      return <div key={key} style={{ height: "7px" }} />;
    }
    return <div key={key}>{renderRichText(line)}</div>;
  });
}

function PersonAvatar() {
  return (
    <div
      style={{
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        background: "var(--accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: "2px",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}

function SparkleAvatar() {
  return (
    <div
      style={{
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: "2px",
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
        <path d="M18 15l0.8 2.2L21 18l-2.2 0.8L18 21l-0.8-2.2L15 18l2.2-0.8z" />
      </svg>
    </div>
  );
}

export default function AgentPanel({
  open,
  onToggle,
  messages,
  isBusy,
  onSend,
}: AgentPanelProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [input, setInput] = useState("");
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);

  const toggleFeature = (id: string) =>
    setFeatures((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Drag handling: header mousedown starts, window listeners track
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragOffset.current) return;
      const width = panelRef.current?.offsetWidth ?? 340;
      const height = panelRef.current?.offsetHeight ?? 420;
      setPos({
        x: Math.min(Math.max(0, e.clientX - dragOffset.current.dx), window.innerWidth - width),
        y: Math.min(Math.max(0, e.clientY - dragOffset.current.dy), window.innerHeight - height),
      });
    };
    const onUp = () => {
      dragOffset.current = null;
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    if (pos === null) setPos({ x: rect.left, y: rect.top });
    document.body.style.userSelect = "none";
  };

  const submit = () => {
    let text = input.trim();
    if (!text || isBusy) return;
    if (features.length > 0) {
      const hints = DOC_FEATURES.filter((f) => features.includes(f.id)).map((f) => f.hint);
      text += `\n\nThe document should include: ${hints.join("; ")}.`;
    }
    setInput("");
    setFeaturesOpen(false);
    onSend(text);
  };

  if (!open) {
    return (
      <button
        onClick={() => onToggle(true)}
        title="Open agent panel"
        style={{
          position: "fixed",
          right: "24px",
          bottom: "24px",
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: "1px solid var(--border)",
          background: "#3a3226",
          cursor: "pointer",
          zIndex: 90,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img src="/logo.png" alt="Particl" style={{ width: "62%", height: "62%", objectFit: "contain" }} />
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        ...(pos
          ? { left: `${pos.x}px`, top: `${pos.y}px` }
          : { right: "24px", bottom: "24px" }),
        width: "min(420px, 92vw)",
        height: "min(600px, 80vh)",
        display: "flex",
        flexDirection: "column",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        background: "var(--bg-surface)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        zIndex: 90,
        overflow: "hidden",
      }}
    >
      {/* Header (drag handle) */}
      <div
        onMouseDown={startDrag}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          cursor: "move",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--text-muted)">
          <circle cx="5" cy="7" r="1.5" /><circle cx="12" cy="7" r="1.5" /><circle cx="19" cy="7" r="1.5" />
          <circle cx="5" cy="14" r="1.5" /><circle cx="12" cy="14" r="1.5" /><circle cx="19" cy="14" r="1.5" />
        </svg>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
          Agent
        </span>
        {isBusy && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        )}
        <button
          onClick={() => onToggle(false)}
          aria-label="Collapse agent panel"
          style={{
            border: "none",
            background: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "14px",
            lineHeight: 1,
            padding: "2px",
          }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          minHeight: "120px",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "0 24px",
              gap: "6px",
            }}
          >
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginBottom: "8px" }}
            >
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
              <path d="M18 15l0.8 2.2L21 18l-2.2 0.8L18 21l-0.8-2.2L15 18l2.2-0.8z" />
            </svg>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
              Hi! I&apos;m your LaTeX assistant
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6 }}>
              Ask me to help with formatting, equations, or document structure.
            </p>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "tool" ? (
            <div
              key={m.id}
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                textAlign: "center",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              🔧 {m.text}
            </div>
          ) : m.role === "user" ? (
            <div
              key={m.id}
              style={{
                display: "flex",
                gap: "8px",
                alignSelf: "flex-end",
                maxWidth: "85%",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "12px 12px 2px 12px",
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: "12px",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {renderRichText(m.text)}
              </div>
              <PersonAvatar />
            </div>
          ) : (
            <div
              key={m.id}
              style={{
                display: "flex",
                gap: "8px",
                alignSelf: "flex-start",
                maxWidth: "92%",
              }}
            >
              {i === 0 || messages[i - 1].role !== "agent" ? (
                <SparkleAvatar />
              ) : (
                <div style={{ width: "24px", flexShrink: 0 }} />
              )}
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "12px 12px 12px 2px",
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  lineHeight: 1.55,
                  wordBreak: "break-word",
                }}
              >
                {renderMessageBody(m.text)}
              </div>
            </div>
          )
        )}
      </div>

      {/* Document features checklist */}
      {featuresOpen && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            padding: "10px 12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Include in document
            </span>
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
              {features.length === 0 ? "none ticked — the agent decides" : `${features.length} selected`}
            </span>
            {features.length > 0 && (
              <button
                onClick={() => setFeatures([])}
                style={{ marginLeft: "auto", border: "none", background: "none", color: "var(--accent)", fontSize: "10px", cursor: "pointer", padding: 0 }}
              >
                Clear
              </button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {DOC_FEATURES.map((f) => {
              const on = features.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFeature(f.id)}
                  title={f.hint}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "6px 9px",
                    borderRadius: "7px",
                    border: on ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: on ? "var(--accent-dim)" : "var(--bg-surface)",
                    color: "var(--text-primary)",
                    fontSize: "11px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: "13px",
                      height: "13px",
                      borderRadius: "4px",
                      border: on ? "none" : "1px solid var(--border)",
                      background: on ? "var(--accent)" : "transparent",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {on && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "10px 12px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <button
          onClick={() => setFeaturesOpen((o) => !o)}
          title="Choose document features"
          aria-label="Choose document features"
          style={{
            position: "relative",
            padding: "8px 10px",
            borderRadius: "8px",
            border: featuresOpen || features.length > 0 ? "1px solid var(--accent)" : "1px solid var(--border)",
            background: featuresOpen ? "var(--accent-dim)" : "var(--bg-base)",
            color: features.length > 0 ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" /><circle cx="9" cy="7" r="2.2" fill="var(--bg-base)" />
            <line x1="4" y1="14" x2="20" y2="14" /><circle cx="15" cy="14" r="2.2" fill="var(--bg-base)" />
          </svg>
          {features.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                minWidth: "14px",
                height: "14px",
                borderRadius: "7px",
                background: "var(--accent)",
                color: "#fff",
                fontSize: "9px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
              }}
            >
              {features.length}
            </span>
          )}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            isBusy
              ? "Waiting for response..."
              : messages.length === 0
              ? "Describe your document..."
              : "Ask about your document..."
          }
          disabled={isBusy}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg-base)",
            color: "var(--text-primary)",
            fontSize: "12px",
            outline: "none",
          }}
        />
        <button
          onClick={submit}
          disabled={!input.trim() || isBusy}
          aria-label="Send"
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            background: !input.trim() || isBusy ? "var(--bg-elevated)" : "var(--accent)",
            color: !input.trim() || isBusy ? "var(--text-muted)" : "#fff",
            cursor: !input.trim() || isBusy ? "not-allowed" : "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
