import { useCanvas } from "./context";

interface GroupActionButtonProps {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export function GroupActionButton({
  position = "top-right",
}: GroupActionButtonProps) {
  const { editor } = useCanvas();
  const selectedNodeIds = editor.state.selection.nodeIds;

  // Only show the button when multiple nodes are selected
  if (selectedNodeIds.length <= 1) {
    return null;
  }

  // Check if any selected nodes are already part of a group
  const hasGroupedNodes = selectedNodeIds.some((nodeId) => {
    const node = editor.state.getNodeById(nodeId);
    return node && node.data.parentId;
  });

  // Don't show the button if any selected nodes are already grouped
  if (hasGroupedNodes) {
    return null;
  }

  const handleCreateGroup = () => {
    const groupNode = editor.createGroup();
    if (groupNode) {
    }
  };

  // Calculate position styles based on the position prop
  let positionStyles = {};
  switch (position) {
    case "top-left":
      positionStyles = { top: "20px", left: "20px" };
      break;
    case "bottom-right":
      positionStyles = { bottom: "20px", right: "20px" };
      break;
    case "bottom-left":
      positionStyles = { bottom: "20px", left: "20px" };
      break;
    case "top-right":
    default:
      positionStyles = { top: "20px", right: "20px" };
      break;
  }

  return (
    <button
      style={{
        position: "absolute",
        zIndex: 1000,
        padding: "8px 12px",
        backgroundColor: "#3182ce",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontWeight: "bold",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
        ...positionStyles,
      }}
      onClick={handleCreateGroup}
    >
      Create Group
    </button>
  );
}
