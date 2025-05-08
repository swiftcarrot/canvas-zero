import type { Editor } from "../editor";
import { createSvgPath } from "../svg";
import type { Edge, Point } from "../types";

export interface CustomEdgeProps {
  edge: Edge;
  editor: Editor;
  isSelected: boolean;
  points: Point[];
  onEdgeInteraction: (event: React.PointerEvent, edge: Edge) => void;
}

export function EdgeRenderer({
  edge,
  editor,
  edgeTypes,
  onEdgeInteraction,
}: {
  edge: Edge;
  editor: Editor;
  edgeTypes?: Record<string, React.ComponentType<CustomEdgeProps>>;
  onEdgeInteraction: (event: React.PointerEvent, edge: Edge) => void;
}) {
  const isSelected = editor.state.selection.edgeIds.includes(edge.id);
  const points = edge.points || [];
  const pathString = createSvgPath(points);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onEdgeInteraction(e, edge);
  };

  // Use custom component if available for this edge type
  const CustomEdgeComponent = edgeTypes?.[edge.type];

  return (
    <g onPointerDown={handlePointerDown} style={{ cursor: "pointer" }}>
      {CustomEdgeComponent ? (
        <CustomEdgeComponent
          edge={edge}
          editor={editor}
          isSelected={isSelected}
          points={points}
          onEdgeInteraction={onEdgeInteraction}
        />
      ) : (
        <path
          d={pathString}
          fill="none"
          stroke={isSelected ? "#3182ce" : "#64748b"}
          strokeWidth={isSelected ? 2 : 2}
          pointerEvents="stroke"
        />
      )}
    </g>
  );
}
