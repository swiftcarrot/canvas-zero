import type { Editor } from "../editor";
import type { Node } from "../types";
import { useEditorState } from "./context";
import { Resizable } from "./resizable";

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

  const handleResize = (newWidth: number, height: number) => {
    editor.resizeNode(node.id, newWidth, height);
  };

  const handleResizeEnd = (finalWidth: number, finalHeight: number) => {
    // The final state is already committed by handleResize
    // This is needed if we want to perform any additional actions when resizing is complete
  };

  const CustomNodeComponent = nodeTypes?.[node.type];

  return (
    <div
      data-node-id={node.id}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        cursor: "move",
        userSelect: "none",
        zIndex: isSelected ? 1 : 0,
      }}
    >
      <Resizable
        width={width}
        height={height}
        isSelected={isSelected!}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
      >
        <div
          style={{ width: "100%", height: "100%" }}
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
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
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
      </Resizable>
    </div>
  );
};
