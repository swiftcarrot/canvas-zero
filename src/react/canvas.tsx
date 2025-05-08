import { Editor } from "../editor";
import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
  useEffect,
} from "react";
import type { CanvasState } from "../canvas-state";
import type { Node, Edge, Point } from "../types";
import { SelectionBox } from "./selection";
import { CanvasContext, useEditorState } from "./context";
import { NodeRenderer, type CustomNodeProps } from "./node";
import { EdgeRenderer, type CustomEdgeProps } from "./edge";
import { GroupNode } from "./group-node";
import { BackgroundGrid } from "./background-grid";

export interface CanvasProps {
  style?: React.CSSProperties;
  className?: string;
  initialState?: Partial<CanvasState>;
  onStateChange?: (state: Pick<CanvasState, "nodes" | "edges">) => void;
  nodeTypes?: Record<string, React.ComponentType<CustomNodeProps>>;
  edgeTypes?: Record<string, React.ComponentType<CustomEdgeProps>>;
  children?: ReactNode;
  editorRef?: React.RefObject<Editor | null>;
}

interface CanvasContentProps extends CanvasProps {
  editor: Editor;
}

export function Canvas({ initialState, editorRef, ...props }: CanvasProps) {
  const editor = useRef<Editor>(
    new Editor(
      initialState
        ? { nodes: initialState.nodes, edges: initialState.edges }
        : {}
    )
  );
  editorRef!.current = editor.current;

  return (
    <CanvasContext.Provider value={{ editor: editor.current }}>
      <CanvasContent editor={editor.current} {...props} />
    </CanvasContext.Provider>
  );
}

export function CanvasContent({
  style,
  className,
  onStateChange,
  children,
  nodeTypes: customNodeTypes,
  edgeTypes,
  editor,
}: CanvasContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeTypes = {
    group: GroupNode,
    ...customNodeTypes,
  };

  const viewport = useEditorState((state) => state.viewport);
  const nodes = useEditorState((state) => state.nodes);
  const edges = useEditorState((state) => state.edges);
  const selection = useEditorState((state) => state.selection);
  const isDragging = useEditorState((state) => state.isDragging);
  const isPanning = useEditorState((state) => state.isPanning);

  const [selectionBox, setSelectionBox] = useState<{
    start: Point;
    current: Point;
    visible: boolean;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (containerRef.current) {
        // Delete/Backspace key to delete selected elements
        if (e.key === "Backspace" || e.key === "Delete") {
          const selectedNodeIds = [...editor.state.selection.nodeIds];
          const selectedEdgeIds = [...editor.state.selection.edgeIds];
          selectedEdgeIds.forEach((edgeId) => {
            editor.deleteEdge(edgeId);
          });
          selectedNodeIds.forEach((nodeId) => {
            editor.deleteNode(nodeId);
          });
        }

        // Create group: Ctrl+G or Cmd+G
        // if ((e.ctrlKey || e.metaKey) && e.key === "g") {
        //   e.preventDefault();
        //   editor.createGroup();
        // }

        // Undo: Ctrl+Z or Cmd+Z
        if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          if (editor.canUndo()) {
            editor.undo();
          }
        }

        // Redo: Ctrl+Y or Cmd+Y or Ctrl+Shift+Z or Cmd+Shift+Z
        if (
          (e.ctrlKey || e.metaKey) &&
          (e.key === "y" || (e.key === "z" && e.shiftKey))
        ) {
          e.preventDefault();
          if (editor.canRedo()) {
            editor.redo();
          }
        }
      }
    };

    // Add event listener to window to catch keyboard events
    window.addEventListener("keydown", handleKeyDown);

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editor]);

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
    },
    [editor, getCanvasPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const point = { x: e.clientX, y: e.clientY };

      if (editor.state.isPanning) {
        editor.continuePan(point);
      } else if (editor.state.isDragging) {
        const canvasPoint = getCanvasPoint(e);
        editor.dragNodes(canvasPoint);
        return;
      } else if (selectionBox) {
        const canvasPoint = getCanvasPoint(e);
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
          editor.selectByRect({ x, y, w: width, h: height });
        }
      }
    },
    [editor, getCanvasPoint, selectionBox]
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
    },
    [editor]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // e.preventDefault();
      // const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      // const point = { x: e.clientX, y: e.clientY };
      // if (editor) {
      //   editor.zoom(zoomFactor, point);
      // }
    },
    [editor]
  );

  const handleNodeInteraction = useCallback(
    (e: React.PointerEvent, node: Node) => {
      const canvasPoint = getCanvasPoint(e); // Already snapped
      editor.startNodeDrag(node.id, canvasPoint);
    },
    [editor, getCanvasPoint]
  );

  const handleEdgeInteraction = useCallback(
    (e: React.PointerEvent, edge: Edge) => {
      // Currently just selects the edge, but could be extended for edge manipulation
      editor.select([], [edge.id], !e.shiftKey);
    },
    [editor]
  );

  const renderSelectionBox = selectionBox?.visible
    ? {
        x: Math.min(selectionBox.start.x, selectionBox.current.x),
        y: Math.min(selectionBox.start.y, selectionBox.current.y),
        width: Math.abs(selectionBox.start.x - selectionBox.current.x),
        height: Math.abs(selectionBox.start.y - selectionBox.current.y),
      }
    : null;

  const viewportTransform = viewport
    ? `translate(${-viewport.box.x * viewport.zoom}, ${
        -viewport.box.y * viewport.zoom
      }) scale(${viewport.zoom})`
    : "";

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        backgroundColor: "#f7fafc",
        cursor: isPanning ? "grabbing" : "default",
        ...style,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onPointerCancel={handlePointerUp}
      touch-action="none"
    >
      <BackgroundGrid viewport={viewport!} />

      <svg
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
          {edges!.map((edge) => (
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
        {nodes!.map((node) => (
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
  );
}
