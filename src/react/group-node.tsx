import React from "react";
import type { Editor } from "../editor";
import type { Node } from "../types";

interface GroupNodeProps {
  node: Node;
  editor: Editor;
  isSelected: boolean;
  onNodeInteraction: (event: React.PointerEvent, node: Node) => void;
}

export function GroupNode({
  node,
  editor,
  isSelected,
  onNodeInteraction,
}: GroupNodeProps) {
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Ungroup when double-clicking on a group node
    editor.ungroup();
  };

  return (
    <div
      style={{
        backgroundColor: "rgba(242, 242, 250, 0.8)",
        border: isSelected ? "2px solid #3182ce" : "1px solid #cbd5e0",
        borderRadius: "6px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        padding: "8px",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        position: "relative",
      }}
      onDoubleClick={handleDoubleClick}
      title="Double-click to ungroup"
    >
      <div
        style={{
          position: "absolute",
          top: "8px",
          left: "8px",
          fontSize: "12px",
          fontWeight: "bold",
          padding: "2px 6px",
          backgroundColor: isSelected ? "#ebf8ff" : "#f7fafc",
          border: "1px solid #bee3f8",
          borderRadius: "4px",
        }}
      >
        {node.data.label || "Group"}
      </div>
      {/* Children nodes are rendered separately by the Canvas component */}
    </div>
  );
}
