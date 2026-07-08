"use client";
import { useRef } from "react";
import Editor, { OnMount, BeforeMount } from "@monaco-editor/react";

interface LatexEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  isStreaming?: boolean;
  autoScroll?: boolean;
}

// Plain-text rendering (no syntax colors) — the color belongs in the compiled
// PDF, not the source. Keeps line numbers + minimap like the reference editor.
// Warm "paper" theme to match the sepia app palette.
const configureLatex: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("particl-paper", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#fdfaf2",
      "editor.foreground": "#3a3226",
      "editorLineNumber.foreground": "#bcaf95",
      "editorLineNumber.activeForeground": "#8a6a44",
      "editor.lineHighlightBackground": "#f2ead8",
      "editorCursor.foreground": "#8a6a44",
      "editor.selectionBackground": "#e4d6b8",
      "minimap.background": "#f4ecda",
    },
  });
};

export default function LatexEditor({
  value,
  onChange,
  disabled,
  style,
  isStreaming = false,
  autoScroll = false,
}: LatexEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // Follow the stream: keep the last line in view while generating
  if (autoScroll && isStreaming && editorRef.current) {
    const model = editorRef.current.getModel();
    if (model) {
      editorRef.current.revealLine(model.getLineCount());
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        overflow: "hidden",
        ...style,
      }}
    >
      <Editor
        value={value}
        language="plaintext"
        theme="particl-paper"
        beforeMount={configureLatex}
        onMount={handleMount}
        onChange={(v) => onChange(v ?? "")}
        options={{
          readOnly: disabled,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          lineHeight: 20,
          minimap: { enabled: true, renderCharacters: true },
          wordWrap: "on",
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "line",
          occurrencesHighlight: "off",
          quickSuggestions: false,
          contextmenu: false,
        }}
        loading={
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: "12px",
              background: "var(--bg-surface)",
            }}
          >
            Loading editor…
          </div>
        }
      />
    </div>
  );
}
