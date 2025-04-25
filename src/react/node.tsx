import type { Editor } from "../editor";
import type { Node } from "../state";

export interface CustomNodeProps {
  node: Node;
  editor: Editor;
  isSelected: boolean;
  onNodeInteraction: (event: React.MouseEvent, node: Node) => void;
}

export function NodeRenderer({
  node,
  editor,
  onNodeInteraction,
  nodeTypes,
}: {
  node: Node;
  editor: Editor;
  onNodeInteraction: (event: React.MouseEvent, node: Node) => void;
  nodeTypes?: Record<string, React.ComponentType<CustomNodeProps>>;
}) {
  const isSelected = editor.state.selection.nodeIds.includes(node.id);

  // Use custom component if available for this node type
  const CustomNodeComponent = nodeTypes?.[node.type];

  if (CustomNodeComponent) {
    return (
      <CustomNodeComponent
        node={node}
        editor={editor}
        isSelected={isSelected}
        onNodeInteraction={onNodeInteraction}
      />
    );
  }

  // Fall back to default node component
  return (
    <CanvasNode
      node={node}
      editor={editor}
      onNodeInteraction={onNodeInteraction}
    />
  );
}

interface NodeProps {
  node: Node;
  editor: Editor;
  onNodeInteraction: (event: React.MouseEvent, node: Node) => void;
}

function CanvasNode({ node, editor, onNodeInteraction }: NodeProps) {
  const { position, width = 100, height = 80, type, data } = node;
  const isSelected = editor.state.selection.nodeIds.includes(node.id);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent propagation to avoid triggering canvas pan
    e.stopPropagation();
    onNodeInteraction(e, node);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: width,
        height: height,
        backgroundColor: "#fff",
        border: isSelected ? "2px solid #3182ce" : "1px solid #e2e8f0",
        borderRadius: "4px",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        padding: "8px",
        cursor: "move",
        userSelect: "none",
        overflow: "hidden",
        zIndex: isSelected ? 1 : 0,
      }}
      onMouseDown={handleMouseDown}
    >
      {data.label && (
        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
          {data.label}
        </div>
      )}
      {data.content && <div>{data.content}</div>}
      {!data.label && !data.content && <div>{type}</div>}
    </div>
  );
}
