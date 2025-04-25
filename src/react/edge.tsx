import type { Editor } from "../editor";
import type { Edge } from "../state";
import { createSvgPath } from "../svg";
import type { Point } from "../types";

export interface CustomEdgeProps {
  edge: Edge;
  editor: Editor;
  isSelected: boolean;
  points: Point[];
  onEdgeInteraction: (event: React.MouseEvent, edge: Edge) => void;
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
  onEdgeInteraction: (event: React.MouseEvent, edge: Edge) => void;
}) {
  const isSelected = editor.state.selection.edgeIds.includes(edge.id);
  const points = editor.getEdgePath(edge);
  const pathString = createSvgPath(points);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdgeInteraction(e, edge);
  };

  // Use custom component if available for this edge type
  const CustomEdgeComponent = edgeTypes?.[edge.type];

  return (
    <g onMouseDown={handleMouseDown} style={{ cursor: "pointer" }}>
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
          strokeWidth={isSelected ? 2 : 1}
          pointerEvents="stroke"
        />
      )}
    </g>
  );
}
