import type { Editor } from "../editor";
import type { Edge } from "../state";
import { createSvgPath } from "../svg";
import type { Point } from "../types";

export interface CustomEdgeProps {
  edge: Edge;
  editor: Editor;
  isSelected: boolean;
  points: Point[];
}

export function EdgeRenderer({
  edge,
  editor,
  edgeTypes,
}: {
  edge: Edge;
  editor: Editor;
  edgeTypes?: Record<string, React.ComponentType<CustomEdgeProps>>;
}) {
  const isSelected = editor.state.selection.edgeIds.includes(edge.id);
  const points = editor.getEdgePath(edge);

  // Use custom component if available for this edge type
  const CustomEdgeComponent = edgeTypes?.[edge.type];

  if (CustomEdgeComponent) {
    return (
      <CustomEdgeComponent
        edge={edge}
        editor={editor}
        isSelected={isSelected}
        points={points}
      />
    );
  }

  // Fall back to default edge component
  return <CanvasEdge edge={edge} editor={editor} />;
}

interface EdgeProps {
  edge: Edge;
  editor: Editor;
}

function CanvasEdge({ edge, editor }: EdgeProps) {
  const isSelected = editor.state.selection.edgeIds.includes(edge.id);
  const points = editor.getEdgePath(edge);
  const pathString = createSvgPath(points);

  return (
    <path
      d={pathString}
      fill="none"
      stroke={isSelected ? "#3182ce" : "#64748b"}
      strokeWidth={isSelected ? 2 : 1}
      pointerEvents="stroke"
    />
  );
}
