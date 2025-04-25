import { Editor } from "../editor";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Node, CanvasState } from "../state";
import type { Point } from "../types";
import { SelectionBox } from "./selection";
import { CanvasContext } from "./context";
import { NodeRenderer, type CustomNodeProps } from "./node";
import { EdgeRenderer, type CustomEdgeProps } from "./edge";

export interface CanvasProps {
  style?: React.CSSProperties;
  className?: string;
  state?: Partial<CanvasState>;
  onStateChange?: (state: Pick<CanvasState, "nodes" | "edges">) => void;
  nodeTypes?: Record<string, React.ComponentType<CustomNodeProps>>;
  edgeTypes?: Record<string, React.ComponentType<CustomEdgeProps>>;
  children?: ReactNode;
}

export function Canvas({
  style,
  className,
  state,
  onStateChange,
  children,
  nodeTypes,
  edgeTypes,
}: CanvasProps) {
  // Create editor with initial state if provided
  const [editor] = useState(
    () => new Editor(state ? { nodes: state.nodes, edges: state.edges } : {})
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Force a re-render whenever canvas state changes
  const updateCanvas = useCallback(() => {
    // Notify parent component about state changes
    if (onStateChange) {
      const { nodes, edges } = editor.state;
      onStateChange({ nodes, edges });
    }
  }, [editor, onStateChange]);

  // Update editor when state prop changes
  useEffect(() => {
    if (state) {
      editor.updateState(state);
    }
  }, [editor, state]);

  // Track selection box state
  const [selectionBox, setSelectionBox] = useState<{
    start: Point;
    current: Point;
    visible: boolean;
  } | null>(null);

  // Convert mouse coordinates to canvas coordinates
  const getCanvasPoint = useCallback(
    (e: React.MouseEvent): Point => {
      if (!containerRef.current) return { x: 0, y: 0 };

      const rect = containerRef.current.getBoundingClientRect();
      const screenPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      return editor.state.screenToCanvas(screenPoint);
    },
    [editor]
  );

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        // Left click
        if (e.altKey || e.metaKey) {
          // Pan with alt/cmd key or middle mouse
          const point = { x: e.clientX, y: e.clientY };
          editor.startPan(point);
        } else {
          // Start selection box
          const canvasPoint = getCanvasPoint(e);
          setSelectionBox({
            start: canvasPoint,
            current: canvasPoint,
            visible: false, // Only show after some movement
          });

          // Clear selection if clicking on empty space
          editor.select([], [], true);
        }
      } else if (e.button === 1) {
        // Middle mouse button
        // Pan with middle mouse
        const point = { x: e.clientX, y: e.clientY };
        editor.startPan(point);
      }

      updateCanvas();
    },
    [editor, getCanvasPoint, updateCanvas]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const point = { x: e.clientX, y: e.clientY };

      if (editor.state.isPanning) {
        editor.continuePan(point);
        updateCanvas();
        return;
      }

      if (editor.state.isDragging) {
        const canvasPoint = getCanvasPoint(e);
        editor.dragNodes(canvasPoint);
        updateCanvas();
        return;
      }

      // Update selection box
      if (selectionBox) {
        const canvasPoint = getCanvasPoint(e);
        setSelectionBox({
          ...selectionBox,
          current: canvasPoint,
          visible: true, // Make visible during drag
        });

        // Calculate selection rectangle
        const x = Math.min(selectionBox.start.x, canvasPoint.x);
        const y = Math.min(selectionBox.start.y, canvasPoint.y);
        const width = Math.abs(selectionBox.start.x - canvasPoint.x);
        const height = Math.abs(selectionBox.start.y - canvasPoint.y);

        // Select elements within the box
        if (width > 5 || height > 5) {
          // Small threshold to avoid accidental selections
          editor.selectByRect({ x, y, width, height });
          updateCanvas();
        }
      }
    },
    [editor, getCanvasPoint, selectionBox, updateCanvas]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (editor.state.isPanning) {
        editor.stopPan();
      }

      if (editor.state.isDragging) {
        editor.stopDrag();
      }

      // Clear selection box
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

  // Node interaction handler
  const handleNodeInteraction = useCallback(
    (e: React.MouseEvent, node: Node) => {
      const canvasPoint = getCanvasPoint(e);
      editor.startNodeDrag(node.id, canvasPoint);
      updateCanvas();
    },
    [editor, getCanvasPoint, updateCanvas]
  );

  // Set up container ref and event listeners
  useEffect(() => {
    if (containerRef.current) {
      editor.setContainer(containerRef.current);
    }
  }, [editor]);

  // Calculate selection box coordinates for rendering
  const renderSelectionBox = selectionBox?.visible
    ? {
        x: Math.min(selectionBox.start.x, selectionBox.current.x),
        y: Math.min(selectionBox.start.y, selectionBox.current.y),
        width: Math.abs(selectionBox.start.x - selectionBox.current.x),
        height: Math.abs(selectionBox.start.y - selectionBox.current.y),
      }
    : null;

  // Apply viewport transform for SVG elements
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Background grid */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "radial-gradient(#cbd5e0 1px, transparent 0)",
            backgroundSize: `${20 * editor.state.viewport.zoom}px ${
              20 * editor.state.viewport.zoom
            }px`,
            backgroundPosition: `${
              (-editor.state.viewport.rect.x * editor.state.viewport.zoom) %
              (20 * editor.state.viewport.zoom)
            }px ${
              (-editor.state.viewport.rect.y * editor.state.viewport.zoom) %
              (20 * editor.state.viewport.zoom)
            }px`,
            transform: "translate(0px, 0px)",
          }}
        />

        {/* SVG layer for edge rendering */}
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
              />
            ))}
          </g>
        </svg>

        {/* Nodes */}
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

        {children}
      </div>
    </CanvasContext.Provider>
  );
}
