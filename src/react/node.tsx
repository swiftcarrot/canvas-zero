import type { Editor } from "../editor";
import type { Node } from "../types";
import { useEditorState } from "./context";

export interface CustomNodeProps {
  node: Node;
  editor: Editor;
  isSelected: boolean;
  onNodeInteraction: (event: React.PointerEvent, node: Node) => void;
}

export const NodeRenderer = ({
  node,
  editor,
  onNodeInteraction,
  nodeTypes,
}: {
  node: Node;
  editor: Editor;
  onNodeInteraction: (event: React.PointerEvent, node: Node) => void;
  nodeTypes?: Record<string, React.ComponentType<CustomNodeProps>>;
}) => {
  const { position, width = 100, height = 80, type, data } = node;
  const isSelected = useEditorState((state) =>
    state.selection.nodeIds.includes(node.id)
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onNodeInteraction(e, node);
  };

  const CustomNodeComponent = nodeTypes?.[node.type];

  return (
    <div
      data-node-id={node.id}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: width,
        height: height,
        cursor: "move",
        userSelect: "none",
        zIndex: isSelected ? 1 : 0,
      }}
      onPointerDown={handlePointerDown}
    >
      {CustomNodeComponent ? (
        <CustomNodeComponent
          node={node}
          editor={editor}
          isSelected={isSelected!}
          onNodeInteraction={onNodeInteraction}
        />
      ) : (
        <div
          style={{
            backgroundColor: "#fff",
            border: isSelected ? "2px solid #3182ce" : "1px solid #e2e8f0",
            borderRadius: "4px",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
            padding: "8px",
          }}
        >
          {data.label && (
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
              {data.label}
            </div>
          )}
          {data.content && <div>{data.content}</div>}
          {!data.label && !data.content && <div>{type}</div>}
        </div>
      )}
    </div>
  );
};
