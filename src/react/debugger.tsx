import React, { useState } from "react";
import { useCanvas, useEditorState } from "./context";

interface DebuggerProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Debugger({ className, style }: DebuggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { editor } = useCanvas();
  const state = useEditorState((state) => state);

  const handleCopyClick = () => {
    const stateJson = JSON.stringify(state, null, 2);
    navigator.clipboard.writeText(stateJson).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      () => {
        console.error("Failed to copy state to clipboard");
      }
    );
  };

  const toggleDebugger = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        zIndex: 1000,
        ...style,
      }}
    >
      <button
        onClick={toggleDebugger}
        style={{
          padding: "8px 12px",
          backgroundColor: "#4a5568",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          fontSize: "14px",
        }}
      >
        {isOpen ? "Hide Debugger" : "Show Debugger"}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            right: 0,
            marginBottom: "10px",
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            padding: "16px",
            boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
            width: "300px",
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "16px" }}>Canvas State</h3>
            <button
              onClick={handleCopyClick}
              style={{
                padding: "6px 10px",
                backgroundColor: copySuccess ? "#48bb78" : "#4299e1",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {copySuccess ? "Copied!" : "Copy JSON"}
            </button>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <strong>Nodes:</strong> {editor.state.nodes.length}
          </div>

          <div style={{ marginBottom: "10px" }}>
            <strong>Edges:</strong> {editor.state.edges.length}
          </div>

          <div style={{ marginBottom: "10px" }}>
            <strong>Selection:</strong> {editor.state.selection.nodeIds.length}{" "}
            nodes, {editor.state.selection.edgeIds.length} edges
          </div>

          <div style={{ marginBottom: "10px" }}>
            <strong>Zoom:</strong> {editor.state.viewport.zoom.toFixed(2)}
          </div>

          <div style={{ marginBottom: "10px" }}>
            <strong>Position:</strong> ({editor.state.viewport.box.x.toFixed(0)}
            , {editor.state.viewport.box.y.toFixed(0)})
          </div>

          <div
            style={{
              marginTop: "10px",
              padding: "8px",
              backgroundColor: "#f7fafc",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "monospace",
              maxHeight: "200px",
              overflowY: "auto",
              border: "1px solid #e2e8f0",
            }}
          >
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(state, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
