import { Editor } from "../editor";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { CanvasState } from "../state";
import type { Node, Edge, Point } from "../types";
import { SelectionBox } from "./selection";
import { CanvasContext } from "./context";
import { NodeRenderer, type CustomNodeProps } from "./node";
import { EdgeRenderer, type CustomEdgeProps } from "./edge";
import { GroupNode } from "./group-node";
import { GroupActionButton } from "./group-action-button";
import { BackgroundGrid } from "./background-grid";

export interface CanvasProps {
  style?: React.CSSProperties;
  className?: string;
  state?: Partial<CanvasState>;
  onStateChange?: (state: Pick<CanvasState, "nodes" | "edges">) => void;
  nodeTypes?: Record<string, React.ComponentType<CustomNodeProps>>;
  edgeTypes?: Record<string, React.ComponentType<CustomEdgeProps>>;
  children?: ReactNode;
  editorRef?: React.RefObject<Editor | null>;
}

export function Canvas({
  style,
  className,
  state,
  onStateChange,
  children,
  nodeTypes: customNodeTypes,
  edgeTypes,
  editorRef, // TODO: canvas ref?
}: CanvasProps) {
  const [editor] = useState(
    () => new Editor(state ? { nodes: state.nodes, edges: state.edges } : {})
  );

  const nodeTypes = {
    group: GroupNode,
    ...customNodeTypes,
  };

  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const updateCanvas = useCallback(() => {
    if (onStateChange) {
      const { nodes, edges } = editor.state;
      onStateChange({ nodes, edges });
    }
  }, [editor, onStateChange]);

  // Subscribe to canvas update events from the Editor's event emitter
  useEffect(() => {
    const handleCanvasUpdate = (data: any) => {
      if (data.type === "node-created") {
        updateCanvas();
      }
    };

    const unsubscribe = editor.events.on("canvas:update", handleCanvasUpdate);

    return () => {
      unsubscribe();
    };
  }, [editor, updateCanvas]);

  useEffect(() => {
    if (state) {
      editor.updateState(state);
    }
  }, [editor, state]);

  const [selectionBox, setSelectionBox] = useState<{
    start: Point;
    current: Point;
    visible: boolean;
  } | null>(null);

  const getCanvasPoint = useCallback(
    (e: React.PointerEvent): Point => {
      if (!containerRef.current) return { x: 0, y: 0 };

      const rect = containerRef.current.getBoundingClientRect();
      const screenPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      // Snap the point to the grid after converting to canvas coordinates
      return editor.snapPointToGrid(editor.state.screenToCanvas(screenPoint));
    },
    [editor]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 0) {
        if (e.altKey || e.metaKey) {
          const point = { x: e.clientX, y: e.clientY };
          editor.startPan(point);
        } else {
          const canvasPoint = getCanvasPoint(e); // Already snapped by getCanvasPoint
          setSelectionBox({
            start: canvasPoint,
            current: canvasPoint,
            visible: false,
          });
          editor.select([], [], true);
        }
      } else if (e.button === 1) {
        const point = { x: e.clientX, y: e.clientY };
        editor.startPan(point);
      }

      updateCanvas();
    },
    [editor, getCanvasPoint, updateCanvas]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const point = { x: e.clientX, y: e.clientY };

      if (editor.state.isPanning) {
        editor.continuePan(point);
        updateCanvas();
        return;
      }

      if (editor.state.isDragging) {
        const canvasPoint = getCanvasPoint(e); // Already snapped
        editor.dragNodes(canvasPoint);
        updateCanvas();
        return;
      }

      if (selectionBox) {
        const canvasPoint = getCanvasPoint(e); // Already snapped
        setSelectionBox({
          ...selectionBox,
          current: canvasPoint,
          visible: true,
        });
        const x = Math.min(selectionBox.start.x, canvasPoint.x);
        const y = Math.min(selectionBox.start.y, canvasPoint.y);
        const width = Math.abs(selectionBox.start.x - canvasPoint.x);
        const height = Math.abs(selectionBox.start.y - canvasPoint.y);

        if (width > 5 || height > 5) {
          // selectByRect in editor should handle snapping of the rect itself
          editor.selectByRect({ x, y, width, height });
          updateCanvas();
        }
      }
    },
    [editor, getCanvasPoint, selectionBox, updateCanvas]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (editor.state.isPanning) {
        editor.stopPan();
      }
      if (editor.state.isDragging) {
        editor.stopDrag();
      }
      setSelectionBox(null);
      updateCanvas();
    },
    [editor, updateCanvas]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // e.preventDefault();
      // const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      // const point = { x: e.clientX, y: e.clientY };
      // editor.zoom(zoomFactor, point);
      // updateCanvas();
    },
    [editor, updateCanvas]
  );

  const handleNodeInteraction = useCallback(
    (e: React.PointerEvent, node: Node) => {
      const canvasPoint = getCanvasPoint(e); // Already snapped
      editor.startNodeDrag(node.id, canvasPoint);
      updateCanvas();
    },
    [editor, getCanvasPoint, updateCanvas]
  );

  const handleEdgeInteraction = useCallback(
    (e: React.PointerEvent, edge: Edge) => {
      // Currently just selects the edge, but could be extended for edge manipulation
      editor.select([], [edge.id], !e.shiftKey);
      updateCanvas();
    },
    [editor, updateCanvas]
  );

  useEffect(() => {
    if (containerRef.current) {
      editor.setContainer(containerRef.current);
    }
  }, [editor]);

  const renderSelectionBox = selectionBox?.visible
    ? {
        x: Math.min(selectionBox.start.x, selectionBox.current.x),
        y: Math.min(selectionBox.start.y, selectionBox.current.y),
        width: Math.abs(selectionBox.start.x - selectionBox.current.x),
        height: Math.abs(selectionBox.start.y - selectionBox.current.y),
      }
    : null;

  const viewportTransform = `translate(${
    -editor.state.viewport.rect.x * editor.state.viewport.zoom
  }, ${-editor.state.viewport.rect.y * editor.state.viewport.zoom}) scale(${
    editor.state.viewport.zoom
  })`;

  return (
    <CanvasContext.Provider value={{ editor, updateCanvas }}>
      <div
        ref={containerRef}
        className={className}
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          height: "100%",
          backgroundColor: "#f7fafc",
          cursor: editor.state.isPanning ? "grabbing" : "default",
          ...style,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onPointerCancel={handlePointerUp}
        touch-action="none"
      >
        <BackgroundGrid viewport={editor.state.viewport} />

        <svg
          ref={svgRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          <g transform={viewportTransform}>
            {editor.state.edges.map((edge) => (
              <EdgeRenderer
                key={edge.id}
                edge={edge}
                editor={editor}
                edgeTypes={edgeTypes}
                onEdgeInteraction={handleEdgeInteraction}
              />
            ))}
          </g>
        </svg>

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: viewportTransform,
            transformOrigin: "0 0",
          }}
        >
          {editor.state.nodes.map((node) => (
            <NodeRenderer
              key={node.id}
              node={node}
              editor={editor}
              onNodeInteraction={handleNodeInteraction}
              nodeTypes={nodeTypes}
            />
          ))}
        </div>

        {renderSelectionBox && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: viewportTransform,
              transformOrigin: "0 0",
            }}
          >
            <SelectionBox box={renderSelectionBox} />
          </div>
        )}

        <GroupActionButton position="top-right" />

        {children}
      </div>
    </CanvasContext.Provider>
  );
}
