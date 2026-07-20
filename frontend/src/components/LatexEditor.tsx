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
// Light editor theme aligned with the app's neutral canvas and charcoal accent.
const configureLatex: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("particl-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#f7f7f5",
      "editor.foreground": "#242422",
      "editorLineNumber.foreground": "#9a9893",
      "editorLineNumber.activeForeground": "#242422",
      "editor.lineHighlightBackground": "#e7e6e3",
      "editorCursor.foreground": "#242422",
      "editor.selectionBackground": "#d0cfcc",
      "minimap.background": "#e7e6e3",
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
        theme="particl-light"
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
