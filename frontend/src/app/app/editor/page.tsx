"use client";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { api, AgentEvent, UploadedFile, ReviewResult } from "@/lib/api";

// pdf.js touches browser globals — render client-side only
const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false });
import { useAuth } from "@/lib/auth";
import { getSessionData, setSessionData, clearSessionData, shouldPersistSession, clearNewSessionRequest, clearSessionContent } from "@/lib/session-storage";
import LatexEditor from "@/components/LatexEditor";
import AgentPanel, { AgentMessage } from "@/components/AgentPanel";

type EditorStatus = "idle" | "planning" | "generating" | "compiling" | "fixing" | "done" | "error";

type Conversation = {
  id: string;
  title: string | null;
  prompt: string;
  latex: string | null;
  pdf_url: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
};

export default function EditorPage() {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSignOut = async () => {
    setProfileOpen(false);
    try {
      await logout();
    } finally {
      window.location.href = "/login";
    }
  };
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [latexCode, setLatexCode] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [agentMessage, setAgentMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string; content: string}>>([]);
  const latexRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [isLiveEditing, setIsLiveEditing] = useState(false);
  const [originalLatex, setOriginalLatex] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [agentOpen, setAgentOpen] = useState(true);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const agentMsgId = useRef(0);
  const router = useRouter();
  const [exportOpen, setExportOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [codeVisible, setCodeVisible] = useState(true);
  const [splitPct, setSplitPct] = useState(50);
  const splitRef = useRef<HTMLDivElement>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);

  const runReview = async () => {
    if (!latexCode.trim() || reviewing) return;
    setReviewing(true);
    setReviewOpen(true);
    setReviewResult(null);
    try {
      const result = await api.agent.review(
        latexCode,
        attachedFiles.map((f) => f.file_id)
      );
      setReviewResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
      setReviewOpen(false);
    } finally {
      setReviewing(false);
    }
  };

  const [applyingIdx, setApplyingIdx] = useState<number | null>(null);

  const applySuggestion = (s: ReviewResult["suggestions"][number], idx: number) => {
    if (isStreaming || status === "compiling") return;
    const instruction =
      "Apply this review suggestion to the document, changing only what is needed " +
      `to address it and preserving everything else:\n\n${s.title} — ${s.detail}` +
      (s.location ? `\n(Location: ${s.location})` : "");
    setApplyingIdx(idx);
    setReviewOpen(false);
    startGeneration(instruction).finally(() => setApplyingIdx(null));
  };

  const startSplitDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const onMove = (ev: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(75, Math.max(25, pct)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  const [projectLabel, setProjectLabel] = useState<string | null>(null);

  const formatProjectDate = (d: Date) =>
    d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const exportTex = () => {
    if (!latexCode.trim()) return;
    const blob = new Blob([latexCode], { type: "application/x-tex" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "document.tex";
    a.click();
    URL.revokeObjectURL(a.href);
    setExportOpen(false);
  };

  const exportPdf = () => {
    if (!pdfUrl) return;
    const sep = pdfUrl.includes("?") ? "&" : "?";
    window.open(`${pdfUrl}${sep}download=document.pdf`, "_blank");
    setExportOpen(false);
  };

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const deleteProject = () => {
    if (!currentConversationId) return;
    setConfirmingDelete(true);
  };

  const confirmDeleteProject = async () => {
    if (!currentConversationId) return;
    setConfirmingDelete(false);
    try {
      await api.conversations.delete(currentConversationId);
      handleNewChat();
    } catch {
      setError("Failed to delete project");
    }
  };

  const pendingFilesRef = useRef<UploadedFile[] | null>(null);

  const pushAgentMessage = (role: AgentMessage["role"], text: string) => {
    if (!text) return;
    setAgentMessages((prev) => {
      // Skip repeats (streaming re-emits the same status message)
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.text === text) return prev;
      return [...prev, { id: ++agentMsgId.current, role, text }];
    });
  };

  const cleanTexText = (s: string) =>
    s.replace(/\\\\/g, " ").replace(/\\[a-zA-Z]+/g, "").replace(/[{}$]/g, "").trim();

  const summarizeLatex = (latex: string) => {
    const titleMatch = latex.match(/\\title\{([\s\S]*?)\}\s*(?:\n|\\)/);
    const title = titleMatch ? cleanTexText(titleMatch[1]) : "";

    // Sections with their subsections as short descriptions
    const sectionRe = /\\section\*?\{([^}]*)\}/g;
    const sectionHits = [...latex.matchAll(sectionRe)];
    const contents = sectionHits.slice(0, 12).map((m, i) => {
      const name = cleanTexText(m[1]);
      const start = m.index! + m[0].length;
      const end =
        i + 1 < sectionHits.length ? sectionHits[i + 1].index! : latex.length;
      const subs = [...latex.slice(start, end).matchAll(/\\subsection\*?\{([^}]*)\}/g)]
        .map((s) => cleanTexText(s[1]))
        .filter(Boolean)
        .slice(0, 4);
      return subs.length > 0
        ? `${i + 1}. **${name}** - ${subs.join(", ")}`
        : `${i + 1}. **${name}**`;
    });

    // Formatting features actually present in the document
    const features: string[] = [];
    if (/tcolorbox/.test(latex)) features.push("Color-coded formula and note boxes for easy reference");
    if (/\\tableofcontents/.test(latex)) features.push("A complete table of contents");
    if (/\\begin\{(?:tabular|longtable)/.test(latex)) features.push("Tables for organized information");
    if (/\\begin\{tikzpicture\}|pgfplots/.test(latex)) features.push("Charts and figures");
    if (/fancyhdr/.test(latex)) features.push("Styled headers and footers on every page");
    const formulaCount =
      (latex.match(/\\begin\{(?:align|equation|gather)/g) || []).length +
      (latex.match(/\\\[/g) || []).length;
    if (formulaCount >= 5) features.push(`Over ${formulaCount} formulas and equations`);

    if (contents.length === 0 && features.length === 0) {
      return "Perfect! I've finished the document and compiled it to PDF. It's ready to use!";
    }

    let msg = title
      ? `Perfect! I've created a comprehensive **${title}** that includes:`
      : "Perfect! I've created the document. Here's what it includes:";
    if (contents.length > 0) {
      msg += `\n\n**Document Contents:**\n${contents.join("\n")}`;
    }
    if (features.length > 0) {
      msg += `\n\nThe document is professionally formatted with:\n${features
        .map((f) => `• ${f}`)
        .join("\n")}`;
    }
    msg += "\n\nThe document has been compiled and is ready to use!";
    return msg;
  };

  // Persist session to localStorage with proper cleanup
  useEffect(() => {
    if (!user) return;
    
    // Check if we should persist the session or start fresh
    if (shouldPersistSession()) {
      // Try to persist existing session
      const sessionData = getSessionData();
      
      if (sessionData.conversationId) {
        // Try to load the saved conversation
        api.conversations.get(sessionData.conversationId).then((conv) => {
          if (conv && conv.id) {
            // Conversation exists and user has access - load it
            console.log("Restoring session conversation:", conv.id);
            loadConversation(conv);
          }
          setIsLoaded(true);
        }).catch((error) => {
          // Conversation not found or access denied - clear session data
          console.log("Clearing session: conversation not accessible", error);
          clearSessionData();
          setIsLoaded(true);
        });
      } else if (sessionData.latexCode || sessionData.pdfUrl) {
        // Has session data but no conversation ID - this might be orphaned data
        console.log("Clearing orphaned session data");
        clearSessionData();
        setIsLoaded(true);
      } else {
        setIsLoaded(true);
      }
    } else {
      // Start fresh session - clear any existing data and flags
      console.log("Starting fresh session");
      clearSessionData();
      clearNewSessionRequest();
      setIsLoaded(true);
    }
  }, [user]);

  // Save to localStorage when state changes
  useEffect(() => {
    if (!isLoaded || !user) return;
    
    setSessionData({
      conversationId: currentConversationId || undefined,
      latexCode: latexCode || undefined,
      pdfUrl: pdfUrl || undefined
    });
  }, [currentConversationId, latexCode, pdfUrl, isLoaded, user]);

  useEffect(() => {
    if (latexRef.current) {
      latexRef.current.scrollTop = latexRef.current.scrollHeight;
    }
  }, [latexCode, status]);

  // Handoff from the dashboard: prompt (+ uploaded files) queued in sessionStorage
  useEffect(() => {
    if (!isLoaded || !user) return;
    const pendingPrompt = sessionStorage.getItem("pendingPrompt");
    if (!pendingPrompt) return;
    const pendingFilesRaw = sessionStorage.getItem("pendingFiles");
    sessionStorage.removeItem("pendingPrompt");
    sessionStorage.removeItem("pendingFiles");
    if (pendingFilesRaw) {
      try {
        const files: UploadedFile[] = JSON.parse(pendingFilesRaw);
        pendingFilesRef.current = files;
        setAttachedFiles(files);
      } catch {
        pendingFilesRef.current = null;
      }
    }
    startGeneration(pendingPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user]);

  const loadConversation = (conv: Conversation) => {
    setPrompt("");
    setLatexCode(conv.latex || "");
    setPdfUrl(conv.pdf_url);
    setCurrentConversationId(conv.id);
    setProjectLabel(
      conv.title || `Project ${formatProjectDate(new Date(conv.created_at))}`
    );
    
    // If there's existing latex, mark as generated once
    if (conv.latex) {
      setHasGeneratedOnce(true);
      setOriginalLatex(conv.latex);
    }
    
    // Session data will be saved automatically by the useEffect hook
    
    api.conversations.touch(conv.id).catch(console.error);

    const contextHistory = [
      {
        role: "user" as const,
        content: conv.prompt
      },
      {
        role: "assistant" as const,
        content: `Here is the LaTeX document:\n\n${conv.latex || "No previous document found."}`
      }
    ];
    
    setConversationHistory(contextHistory);
    setStatus(conv.latex ? "done" : "idle");
  };

  const handleNewChat = () => {
    setPrompt("");
    setLatexCode("");
    setPdfUrl(null);
    setError("");
    setAgentMessage("");
    setStatus("idle");
    setCurrentConversationId(null);
    setConversationHistory([]);
    setHasGeneratedOnce(false);
    setIsLiveEditing(false);
    setOriginalLatex("");
    setAgentMessages([]);
    setAgentOpen(true);
    setAttachedFiles([]);
    setProjectLabel(null);

    // Clear session content and mark as new session requested
    clearSessionContent();
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const allowed = [".csv", ".png", ".jpg", ".jpeg", ".pdf"];
    const okFiles = Array.from(files).filter((f) =>
      allowed.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (okFiles.length === 0) {
      setError("Attach a .csv (data), an image, or a .pdf reference paper");
      return;
    }
    setIsUploading(true);
    setError("");
    try {
      for (const file of okFiles) {
        const uploaded = await api.files.upload(file);
        setAttachedFiles((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "File upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.file_id !== fileId));
  };

  const startGeneration = async (overrideText?: string) => {
    const sourceText = overrideText ?? prompt;
    if (!sourceText.trim() || isStreaming || status === "compiling") return;

    const currentPrompt = sourceText;
    if (!overrideText) setPrompt(""); // Clear prompt immediately
    setError("");

    // Agent panel: pop out and show the request + plan narrative
    setAgentOpen(true);
    pushAgentMessage("user", currentPrompt);
    if (!projectLabel) {
      setProjectLabel(`Project ${formatProjectDate(new Date())}`);
    }
    const files = pendingFilesRef.current ?? attachedFiles;
    const fileNote =
      files.length > 0
        ? ` using the data from **${files.map((f) => f.filename).join(", ")}**`
        : "";
    pushAgentMessage(
      "agent",
      hasGeneratedOnce && latexCode.trim()
        ? `I'll update the document based on your request${fileNote}, keeping the rest of the structure intact.`
        : `I'll create a comprehensive, professionally formatted document for you${fileNote} — with a clear structure, highlight boxes for the key material, and everything students and professionals need. Planning the structure now...`
    );

    // Check if this is subsequent generation (live editing mode)
    if (hasGeneratedOnce && latexCode.trim()) {
      // This is a subsequent prompt - use live editing
      await handleLiveEdit(currentPrompt);
    } else {
      // This is first generation - use normal generation
      await handleFirstGeneration(currentPrompt);
    }
  };

  const handleFirstGeneration = async (currentPrompt: string) => {
    setStatus("planning");
    setIsStreaming(true);
    setLatexCode("");
    setPdfUrl(null);
    setAgentMessage("Analyzing request...");

    let receivedConversationId: string | null = null;
    const fileIds = (pendingFilesRef.current ?? attachedFiles).map((f) => f.file_id);
    pendingFilesRef.current = null;

    try {
      const result = await api.agent.stream(
        currentPrompt,
        (data: AgentEvent) => {
          if (data.status) {
            setStatus(data.status as EditorStatus);
          }
          if (data.message) {
            if (data.status === "compiling") {
              pushAgentMessage("tool", `Using tool: compile_latex — ${data.message}`);
            } else {
              pushAgentMessage("agent", data.message);
            }
          }
          if (data.latex) {
            setLatexCode(data.latex);
          }
          if (data.error) {
            setError(data.error);
            pushAgentMessage("agent", `Error: ${data.error}`);
          }
          if (data.conversation_id) {
            receivedConversationId = data.conversation_id;
            setCurrentConversationId(data.conversation_id);
          }
        },
        conversationHistory,
        currentConversationId,
        fileIds
      );
      
      setIsStreaming(false);
      
      if (result?.conversation_id) {
        setCurrentConversationId(result.conversation_id);
        receivedConversationId = result.conversation_id;
      }
      
      if (latexCode || result?.latex) {
        setConversationHistory([
          ...conversationHistory,
          { role: "user", content: currentPrompt },
          { role: "assistant", content: latexCode || result?.latex || "" }
        ]);
        // Mark that we've generated once and store original
        setHasGeneratedOnce(true);
        setOriginalLatex(latexCode || result?.latex || "");
      }
      
      if (result?.pdf_url) {
        setPdfUrl(result.pdf_url);
        setStatus("done");
      } else if (result?.status === "done") {
        setStatus("done");
      } else if (result?.error) {
        setError(result.error);
        setStatus("error");
      } else {
        setStatus("idle");
      }

      if (result?.pdf_url || result?.status === "done") {
        pushAgentMessage("agent", summarizeLatex(result?.latex || latexCode));
      }

      // Attachments are consumed by this generation
      if (fileIds.length > 0) {
        setAttachedFiles([]);
      }
    } catch (err) {
      setIsStreaming(false);
      setError("Generation failed");
      setStatus("error");
    }
  };

  const handleLiveEdit = async (currentPrompt: string) => {
    setIsLiveEditing(true);
    setStatus("generating");
    setAgentMessage("Making live edits...");
    
    // Store the current latex as original if not stored yet
    if (!originalLatex) {
      setOriginalLatex(latexCode);
    }
    
    const fileIds = (pendingFilesRef.current ?? attachedFiles).map((f) => f.file_id);
    pendingFilesRef.current = null;

    try {
      // Simulate live editing by showing gradual changes
      // In a real implementation, this would call a live editing API
      const result = await api.agent.stream(
        currentPrompt,
        (data: AgentEvent) => {
          if (data.status) {
            setStatus(data.status as EditorStatus);
          }
          if (data.message) {
            if (data.status === "compiling") {
              pushAgentMessage("tool", `Using tool: compile_latex — ${data.message}`);
            } else {
              pushAgentMessage("agent", data.message);
            }
          }
          if (data.latex) {
            // Show live editing effect by gradually updating the code
            showLiveEditingEffect(latexCode, data.latex);
          }
          if (data.error) {
            setError(data.error);
            pushAgentMessage("agent", `Error: ${data.error}`);
          }
        },
        conversationHistory,
        currentConversationId,
        fileIds
      );

      setIsLiveEditing(false);
      if (fileIds.length > 0) {
        setAttachedFiles([]);
      }

      if (result?.latex) {
        setConversationHistory([
          ...conversationHistory,
          { role: "user", content: currentPrompt },
          { role: "assistant", content: result.latex }
        ]);
      }

      if (result?.pdf_url || result?.status === "done") {
        pushAgentMessage("agent", "I've applied your changes and recompiled the PDF.");
      }
      
      if (result?.pdf_url) {
        setPdfUrl(result.pdf_url);
        setStatus("done");
      } else if (result?.status === "done") {
        setStatus("done");
      } else if (result?.error) {
        setError(result.error);
        setStatus("error");
      } else {
        setStatus("idle");
      }
    } catch (err) {
      setIsLiveEditing(false);
      setError("Live editing failed");
      setStatus("error");
    }
  };

  const showLiveEditingEffect = (currentCode: string, newCode: string) => {
    // Create a smooth transition effect from current to new code
    const currentLines = currentCode.split('\n');
    const newLines = newCode.split('\n');
    
    // Simple diff-like approach for live editing visualization
    let displayCode = currentCode;
    
    // Animate the transition over time
    const animationSteps = 10;
    const stepDelay = 100; // ms between each step
    
    for (let i = 0; i <= animationSteps; i++) {
      setTimeout(() => {
        const progress = i / animationSteps;
        const blendedLines = newLines.slice(0, Math.floor(newLines.length * progress))
          .concat(currentLines.slice(Math.floor(newLines.length * progress)));
        
        setLatexCode(blendedLines.join('\n'));
      }, i * stepDelay);
    }
    
    // Ensure we end with the final code
    setTimeout(() => {
      setLatexCode(newCode);
    }, animationSteps * stepDelay + 100);
  };

  const compileDocument = async () => {
    if (!latexCode.trim() || status === "compiling" || isStreaming) return;

    setStatus("compiling");
    setIsStreaming(true);
    setPdfUrl(null);
    setError("");
    setAgentMessage("Compiling your changes...");

    try {
      const result = await api.agent.stream(latexCode, (data: AgentEvent) => {
        if (data.error) {
          setError(data.error);
        }
        if (data.conversation_id) {
          setCurrentConversationId(data.conversation_id);
        }
      }, []);

      setIsStreaming(false);

      if (result?.pdf_url) {
        setPdfUrl(result.pdf_url);
        setStatus("done");
        setAgentMessage("Compiled successfully!");
      } else if (result?.error) {
        setError(result.error);
        setStatus("error");
        setAgentMessage("Compilation failed");
      } else {
        setError("Compilation failed");
        setStatus("error");
        setAgentMessage("Compilation failed");
      }
    } catch (err) {
      setIsStreaming(false);
      setError("Compilation failed");
      setStatus("error");
      setAgentMessage("Compilation failed");
    }
  };

  const manualCompile = async () => {
    if (!latexCode.trim() || isStreaming || status === "compiling") return;

    setStatus("compiling");
    setError("");
    setAgentMessage("Compiling...");

    try {
      const result = await api.agent.compile(latexCode, attachedFiles.map((f) => f.file_id));

      if (result?.pdf_url) {
        setPdfUrl(result.pdf_url);
        setStatus("done");
        setAgentMessage("Compiled successfully!");
      } else {
        setError("Compilation failed");
        setStatus("error");
        setAgentMessage("Compilation failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Compilation failed";
      setError(errorMessage);
      setStatus("error");
      setAgentMessage("Compilation failed");
    }
  };

  const isCreating =
    !hasGeneratedOnce &&
    (isStreaming ||
      isLiveEditing ||
      ["planning", "generating", "compiling", "fixing"].includes(status));

  return (
    <>
      <div
        className="theme-paper"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          background: "var(--bg-base)",
          overflow: "hidden",
          position: "relative"
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setIsDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            uploadFiles(e.dataTransfer.files);
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.png,.jpg,.jpeg,.pdf"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              uploadFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
        {isDragOver && (
          <div style={{
            position: "absolute",
            inset: 0,
            zIndex: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(244,236,218,0.82)",
            border: "2px dashed var(--accent)",
            borderRadius: "8px",
            pointerEvents: "none",
          }}>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--accent)" }}>
              Drop your data file to attach it
            </p>
          </div>
        )}
        {/* Editor header: translucent floating groups */}
        <div className="editor-toolbar" style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: "12px",
          padding: "10px 14px",
          background: "transparent",
          flexShrink: 0,
          zIndex: 100,
          position: "relative",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 10px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(8px)",
            justifySelf: "start",
          }}>
          <button
            onClick={() => router.push("/app")}
            title="Back to dashboard"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
          </button>
          <button
            onClick={() => router.push("/app")}
            title="Back to dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "4px 8px 4px 0",
            }}
          >
            <img src="/logo.png" alt="Simpleton" style={{ width: "24px", height: "24px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
            <span className="brand-word" style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
              Simpleton
            </span>
          </button>
          <span className="project-name" style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-primary)",
            maxWidth: "260px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            borderRight: "1px solid var(--border)",
            paddingRight: "12px",
          }}>
            {projectLabel || "New Project"}
          </span>

          {/* Export dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setExportOpen((o) => !o); setFilesOpen(false); setProfileOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              <span className="tb-label">Export</span>
              <svg className="tb-label" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {exportOpen && (
              <div style={{
                position: "absolute",
                top: "36px",
                left: 0,
                minWidth: "170px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                zIndex: 1000,
                overflow: "hidden",
              }}>
                <button
                  onClick={exportPdf}
                  disabled={!pdfUrl}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    width: "100%", padding: "9px 12px", border: "none",
                    background: "transparent", textAlign: "left",
                    color: pdfUrl ? "var(--text-primary)" : "var(--text-muted)",
                    fontSize: "12px", cursor: pdfUrl ? "pointer" : "not-allowed",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  Export as PDF
                </button>
                <button
                  onClick={exportTex}
                  disabled={!latexCode.trim()}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    width: "100%", padding: "9px 12px", border: "none",
                    background: "transparent", textAlign: "left",
                    color: latexCode.trim() ? "var(--text-primary)" : "var(--text-muted)",
                    fontSize: "12px", cursor: latexCode.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 13h6M9 17h6" /></svg>
                  Export as TeX
                </button>
              </div>
            )}
          </div>

          <button
            onClick={deleteProject}
            disabled={!currentConversationId || isStreaming || status === "compiling"}
            title="Delete this project"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: !currentConversationId || isStreaming || status === "compiling"
                ? "not-allowed"
                : "pointer",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={currentConversationId ? "var(--error)" : "var(--text-muted)"} strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 10px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(8px)",
            justifySelf: "center",
          }}>
          {/* Compile */}
          <button
            className="compile-button"
            onClick={manualCompile}
            disabled={!latexCode.trim() || status === "compiling" || isStreaming}
            title="Compile to PDF"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 20px",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: !latexCode.trim() || status === "compiling" || isStreaming
                ? "var(--bg-elevated)"
                : "var(--accent)",
              cursor: !latexCode.trim() || status === "compiling" || isStreaming
                ? "not-allowed"
                : "pointer",
            }}
          >
            {status === "compiling" || isStreaming ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={!latexCode.trim() ? "var(--text-muted)" : "var(--text-on-accent)"} strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            )}
            <span className="tb-label" style={{
              fontSize: "12px",
              fontWeight: 600,
              color: !latexCode.trim() || status === "compiling" || isStreaming ? "var(--text-muted)" : "var(--text-on-accent)",
            }}>
              {status === "compiling" ? "Compiling..." : "Compile"}
            </span>
          </button>

          {/* Review draft */}
          <button
            onClick={runReview}
            disabled={!latexCode.trim() || reviewing || isStreaming}
            title="Review the draft for academic quality"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 16px",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: "transparent",
              color: !latexCode.trim() || reviewing || isStreaming ? "var(--text-muted)" : "var(--text-primary)",
              cursor: !latexCode.trim() || reviewing || isStreaming ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {reviewing ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            )}
            <span className="tb-label">{reviewing ? "Reviewing..." : "Review"}</span>
          </button>

          {/* Files dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setFilesOpen((o) => !o); setExportOpen(false); setProfileOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              <span className="tb-label">Files</span>
              <svg className="tb-label" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {filesOpen && (
              <div style={{
                position: "absolute",
                top: "38px",
                left: 0,
                minWidth: "230px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                zIndex: 1000,
                overflow: "hidden",
              }}>
                <button
                  onClick={() => { setCodeVisible((v) => !v); setFilesOpen(false); }}
                  title={codeVisible ? "Hide code" : "Show code"}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    width: "100%",
                    padding: "9px 12px",
                    border: "none",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)", fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  <span style={{ flex: 1 }}>main.tex</span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {codeVisible ? "shown" : "hidden"}
                  </span>
                </button>
                <div style={{
                  padding: "8px 12px 4px",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}>
                  Project Resources
                </div>
                {attachedFiles.length === 0 && (
                  <p style={{ padding: "0 12px 8px", fontSize: "11px", color: "var(--text-muted)" }}>
                    No data files attached
                  </p>
                )}
                {attachedFiles.map((f) => (
                  <div key={f.file_id} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "6px 12px", fontSize: "12px", color: "var(--text-primary)",
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.filename}
                    </span>
                    <button
                      onClick={() => removeAttachedFile(f.file_id)}
                      aria-label={`Remove ${f.filename}`}
                      style={{ border: "none", background: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => { fileInputRef.current?.click(); setFilesOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    width: "calc(100% - 16px)", margin: "6px 8px 8px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px dashed var(--border)",
                    background: "transparent",
                    color: "var(--text-primary)", fontSize: "12px", cursor: "pointer",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  Upload new resource
                </button>
              </div>
            )}
          </div>

          </div>

          <div style={{
            position: "relative",
            padding: "5px 12px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(8px)",
            justifySelf: "end",
          }}>
            <button
              onClick={() => { setProfileOpen((o) => !o); setExportOpen(false); setFilesOpen(false); }}
              title={user?.email}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <span style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-primary)",
                maxWidth: "130px",
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
                zIndex: 1000,
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

        <div ref={splitRef} className="editor-split" style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          position: "relative"
        }}>
        {isCreating ? (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ animation: "spin 1s linear infinite", marginBottom: "12px" }}><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
            <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
              Creating your document...
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              This may take a moment
            </p>
          </div>
        ) : (
        <>
        {/* Left Side - Editor (fully hidden when the code is hidden; reopen via Files -> main.tex) */}
        <div className="editor-pane" style={{
          flex: "none",
          width: `${splitPct}%`,
          minWidth: 0,
          display: codeVisible ? "flex" : "none",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Agent Status Bar - Small, Above Prompt */}
          {(status !== "idle" || isLiveEditing) && (
            <div style={{
              padding: "8px 16px",
              margin: "8px 12px",
              borderRadius: "6px",
              background: isLiveEditing
                ? "rgba(139, 92, 246, 0.08)"
                : status === "planning" || status === "generating"
                ? "var(--accent-dim)"
                : status === "fixing"
                ? "rgba(248, 113, 113, 0.08)"
                : status === "compiling"
                ? "rgba(96, 165, 250, 0.08)"
                : "var(--success-dim)",
              backdropFilter: "blur(4px)",
              border: `1px solid ${
                isLiveEditing
                  ? "rgba(139, 92, 246, 0.2)"
                  : status === "planning" || status === "generating"
                  ? "var(--accent-glow)"
                  : status === "fixing"
                  ? "rgba(248, 113, 113, 0.2)"
                  : status === "compiling"
                  ? "rgba(96, 165, 250, 0.2)"
                  : "var(--success-glow)"
              }`,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <div style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: isLiveEditing
                  ? "#8b5cf6"
                  : status === "planning" || status === "generating"
                  ? "var(--accent)"
                  : status === "fixing"
                  ? "var(--error)"
                  : status === "compiling"
                  ? "var(--info)"
                  : "var(--success)",
                animation: (isLiveEditing || status === "planning" || status === "generating" || status === "fixing" || status === "compiling")
                  ? "pulse-glow 1.5s ease-in-out infinite"
                  : "none",
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: "11px",
                fontWeight: "500",
                color: isLiveEditing
                  ? "#8b5cf6"
                  : status === "planning" || status === "generating"
                  ? "var(--accent)"
                  : status === "fixing"
                  ? "var(--error)"
                  : status === "compiling"
                  ? "var(--info)"
                  : "var(--success)",
              }}>
                {isLiveEditing ? "Live Editing"
                 : status === "planning" ? "Planning"
                 : status === "generating" ? (hasGeneratedOnce ? "Editing" : "Generating")
                 : status === "compiling" ? "Compiling"
                 : status === "fixing" ? "Self-correcting"
                 : status === "done" ? "Done"
                 : "Error"}: {agentMessage || "Processing..."}
              </span>
            </div>
          )}

          {/* LaTeX Streaming Area */}
          <div
            ref={latexRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: "20px",
              background: "var(--bg-base)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            {latexCode ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                {/* A4 code sheet with a main.tex file-tab header — full width, A4-tall */}
                <div style={{
                  width: "100%",
                  aspectRatio: codeVisible ? "210 / 297" : undefined,
                  height: "auto",
                  flexShrink: 0,
                  margin: "0 auto",
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  boxShadow: "0 6px 28px rgba(0,0,0,0.14)"
                }}>
                  {/* File-tab header — click to show/hide the code */}
                  <div
                    onClick={() => setCodeVisible((v) => !v)}
                    title={codeVisible ? "Hide code" : "Show code"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 14px",
                      borderBottom: codeVisible ? "1px solid var(--border)" : "none",
                      background: "var(--bg-elevated)",
                      flexShrink: 0,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    <span style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      main.tex
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-muted)"
                      strokeWidth="2"
                      style={{
                        transform: codeVisible ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    <div style={{ flex: 1 }} />
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                    }}>
                      <div style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: isLiveEditing
                          ? "#8b5cf6"
                          : isStreaming
                          ? "var(--accent)"
                          : "var(--success)",
                        animation: (isStreaming || isLiveEditing) ? "pulse-glow 1.5s ease-in-out infinite" : "none",
                      }} />
                      {isLiveEditing
                        ? "Editing…"
                        : isStreaming
                        ? (hasGeneratedOnce ? "Editing…" : "Generating…")
                        : "Ready"}
                    </div>
                  </div>
                  {codeVisible && (
                    <LatexEditor
                      value={latexCode}
                      onChange={setLatexCode}
                      disabled={isStreaming}
                      isStreaming={isStreaming}
                      autoScroll={true}
                      style={{
                        flex: 1,
                        minHeight: 0,
                        width: "100%",
                        height: "auto",
                        border: "none",
                        borderRadius: 0,
                        boxShadow: "none",
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center", 
                height: "100%",
                color: "var(--text-muted)"
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: "16px", opacity: 0.5 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                <p style={{ fontSize: "14px", fontWeight: "500" }}>
                  {isStreaming || isLiveEditing ? "Generating..." : "Your LaTeX code will appear here"}
                </p>
                <p style={{ fontSize: "12px", marginTop: "8px" }}>
                  {isStreaming || isLiveEditing
                    ? "Please wait while AI generates your document"
                    : "Describe your document in the Agent panel to get started"
                  }
                </p>
              </div>
            )}

            {error && (
              <div style={{ 
                marginTop: "16px",
                padding: "12px", 
                borderRadius: "8px", 
                background: "var(--error-dim)", 
                border: "1px solid rgba(248,113,113,0.3)"
              }}>
                <p style={{ 
                  fontSize: "12px", 
                  fontWeight: "600", 
                  color: "var(--error)", 
                  marginBottom: "4px" 
                }}>
                  Error
                </p>
                <pre style={{
                  fontSize: "11px",
                  color: "var(--error)",
                  margin: 0,
                  opacity: 0.9
                }}>
                  {error}
                </pre>
              </div>
            )}
          </div>

        </div>

        {/* Drag handle between the code and PDF panes */}
        {codeVisible && (
          <div
            onMouseDown={startSplitDrag}
            title="Drag to resize"
            style={{
              width: "9px",
              margin: "0 -2px",
              flexShrink: 0,
              cursor: "col-resize",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 5,
            }}
          >
            {/* divider line */}
            <div style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "50%",
              width: "1px",
              background: "var(--border)",
            }} />
            {/* grip */}
            <div style={{
              position: "relative",
              width: "10px",
              height: "34px",
              borderRadius: "5px",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
            }}>
              <div style={{ width: "2px", height: "16px", borderRadius: "1px", background: "var(--text-muted)" }} />
            </div>
          </div>
        )}

        {/* Right Side - PDF Display (expands to the central area when the code is hidden) */}
        <div style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-surface)",
          overflow: "hidden"
        }}>
          {/* PDF Preview Area */}
          <div className="preview-pane" style={{ 
            flex: 1, 
            overflow: "auto",
            background: "var(--bg-base)",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {pdfUrl ? (
              <PdfViewer url={pdfUrl} focusZoom={!codeVisible} />
            ) : status === "compiling" ? (
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center", 
                height: "100%",
                color: "var(--text-muted)"
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: "16px", animation: "spin 1s linear infinite", opacity: 0.5 }}><circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                <p style={{ fontSize: "14px", fontWeight: "500" }}>
                  Compiling to PDF...
                </p>
                <p style={{ fontSize: "12px", marginTop: "8px" }}>
                  This may take a few seconds
                </p>
              </div>
            ) : (
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center", 
                height: "100%",
                color: "var(--text-muted)"
              }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: "16px", opacity: 0.4 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15h6M9 11h6" /></svg>
                <p style={{ fontSize: "14px", fontWeight: "500" }}>
                  No document compiled
                </p>
                <p style={{ fontSize: "12px", marginTop: "8px", textAlign: "center", maxWidth: "300px" }}>
                  Generate LaTeX code and click Compile
                </p>
              </div>
            )}
          </div>
        </div>
        </>
        )}
        </div>

        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes fadeUp {
            from { 
              opacity: 0; 
              transform: translateY(10px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }
          
          @keyframes pulse-glow {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.1); }
          }
        `}</style>

        {confirmingDelete && (
          <div
            onClick={() => setConfirmingDelete(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(440px, 90vw)",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                padding: "24px",
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>
                Delete Project
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "20px" }}>
                Are you sure you want to delete &quot;{projectLabel || "this project"}&quot;?
                This action cannot be undone. All files and resources associated
                with this project will be permanently deleted.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProject}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--error)",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <AgentPanel
          open={agentOpen}
          onToggle={setAgentOpen}
          messages={agentMessages}
          isBusy={isStreaming || isLiveEditing || status === "compiling"}
          onSend={(text) => startGeneration(text)}
        />

        {reviewOpen && (
          <div className="review-panel" style={{
            position: "fixed",
            top: "68px",
            right: "20px",
            width: "min(400px, 92vw)",
            maxHeight: "calc(100vh - 100px)",
            display: "flex",
            flexDirection: "column",
            borderRadius: "14px",
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            zIndex: 95,
            overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>Draft review</span>
              <button onClick={() => setReviewOpen(false)} aria-label="Close review" style={{ border: "none", background: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", padding: "14px 16px" }}>
              {reviewing && (
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "center", padding: "24px 0" }}>
                  Reading your draft{reviewResult?.reviewed_papers?.length ? " and reference papers" : ""}…
                </p>
              )}
              {!reviewing && reviewResult && (
                <>
                  {reviewResult.summary && (
                    <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: "14px", fontStyle: "italic" }}>
                      {reviewResult.summary}
                    </p>
                  )}
                  {reviewResult.reviewed_papers?.length > 0 && (
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
                      Grounded in: {reviewResult.reviewed_papers.join(", ")}
                    </p>
                  )}
                  {reviewResult.suggestions.length === 0 && (
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>No issues found — the draft looks solid.</p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {reviewResult.suggestions.map((s, i) => {
                      const sev = s.severity === "high" ? "var(--error)" : s.severity === "medium" ? "var(--accent)" : "var(--text-muted)";
                      return (
                        <div key={i} style={{ borderLeft: `3px solid ${sev}`, background: "var(--bg-elevated)", borderRadius: "8px", padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: sev }}>{s.severity}</span>
                            <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>· {s.category}</span>
                          </div>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "3px" }}>{s.title}</p>
                          <p style={{ fontSize: "12px", lineHeight: 1.55, color: "var(--text-secondary)" }}>{s.detail}</p>
                          {s.location && <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>↳ {s.location}</p>}
                          <button
                            onClick={() => applySuggestion(s, i)}
                            disabled={isStreaming || status === "compiling"}
                            style={{
                              marginTop: "8px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "5px 12px",
                              borderRadius: "999px",
                              border: "none",
                              background: isStreaming || status === "compiling" ? "var(--bg-hover)" : "var(--accent)",
                              color: isStreaming || status === "compiling" ? "var(--text-muted)" : "var(--text-on-accent)",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: isStreaming || status === "compiling" ? "not-allowed" : "pointer",
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                            {applyingIdx === i ? "Applying..." : "Apply with agent"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
