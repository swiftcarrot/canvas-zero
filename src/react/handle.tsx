import { useState, useCallback, useRef, useEffect } from "react";
import { useCanvas } from "./context";
import { generateId } from "../utils";
import type { Point } from "../types";

export interface HandleProps {
  id?: string;
  position?: "top" | "right" | "bottom" | "left"; // TODO: support handle with default position
  type?: string;
  isValidConnection?: (nodeId: string, handleId: string) => boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function Handle({
  id: handleId = "default",
  type = "default",
  isValidConnection,
  className,
}: HandleProps) {
  const { editor, updateCanvas } = useCanvas();
  const [isDragging, setIsDragging] = useState(false);
  const [targetValid, setTargetValid] = useState(true);
  const handleRef = useRef<HTMLDivElement>(null);
  const targetNodeRef = useRef<string | null>(null);
  const targetHandleRef = useRef<string | null>(null);

  useEffect(() => {
    const [nodeId, element] = getParentNodeId();
    const rect1 = element.getBoundingClientRect();
    const rect2 = handleRef.current!.getBoundingClientRect();

    editor.updateHandle({
      id: handleId,
      nodeId,
      box: {
        x: rect2.left - rect1.left,
        y: rect2.top - rect1.top,
        w: rect2.width,
        h: rect2.height,
      },
    });
  }, []);

  const getParentNodeId = useCallback(() => {
    if (!handleRef.current) return null;

    let element = handleRef.current.parentElement;
    while (element) {
      const dataNodeId = element.getAttribute("data-node-id");
      if (dataNodeId) {
        return [dataNodeId, element];
      }
      element = element.parentElement;
    }
    return null;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      const nodeId = getParentNodeId();
      if (!nodeId) return;

      setIsDragging(true);

      // Capture pointer to ensure all pointer events go to this element
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      // Create a temporary edge for visual feedback during dragging
      const tempEdgeId = generateId("edge-temp-");

      // Get source handle position
      const sourceElement = e.target as HTMLElement;
      const sourceRect = sourceElement.getBoundingClientRect();
      const containerRect = editor.container?.getBoundingClientRect();

      if (!containerRect) return;

      const sourcePoint = editor.snapPointToGrid(
        editor.state.screenToCanvas({
          x: sourceRect.left + sourceRect.width / 2 - containerRect.left,
          y: sourceRect.top + sourceRect.height / 2 - containerRect.top,
        })
      );

      // Initial target point is at cursor position
      const targetPoint = editor.snapPointToGrid(
        editor.state.screenToCanvas({
          x: e.clientX - containerRect.left,
          y: e.clientY - containerRect.top,
        })
      );

      const tempEdge = {
        id: tempEdgeId,
        type: "default",
        from: sourcePoint,
        to: targetPoint,
        fromNodeId: nodeId,
        fromHandleId: handleId,
      };

      editor.state.edges.push(tempEdge);

      // Setup global pointer move and pointer up handlers
      const handlePointerMove = (moveEvent: PointerEvent) => {
        // Update the target point to follow the cursor
        if (tempEdge) {
          tempEdge.to = editor.snapPointToGrid(
            editor.state.screenToCanvas({
              x: moveEvent.clientX - containerRect.left,
              y: moveEvent.clientY - containerRect.top,
            })
          );

          // Check if we're over a valid target node
          const elemBelow = document.elementFromPoint(
            moveEvent.clientX,
            moveEvent.clientY
          );

          if (elemBelow) {
            // Try to find a handle element
            const handleElement = elemBelow.closest("[data-handle-id]");
            if (handleElement) {
              const targetNodeId = handleElement
                .closest("[data-node-id]")
                ?.getAttribute("data-node-id");
              const targetHandleId =
                handleElement.getAttribute("data-handle-id");

              if (targetNodeId && targetNodeId !== nodeId) {
                targetNodeRef.current = targetNodeId;
                targetHandleRef.current = targetHandleId;

                // Check if connection is valid
                const isValid = isValidConnection
                  ? isValidConnection(targetNodeId, targetHandleId || "default")
                  : true;

                setTargetValid(isValid);
              }
            } else {
              targetNodeRef.current = null;
              targetHandleRef.current = null;
              setTargetValid(true);
            }
          }

          updateCanvas();
        }
      };

      const handlePointerUp = () => {
        setIsDragging(false);

        // Remove the temporary edge
        editor.state.edges = editor.state.edges.filter(
          (edge) => edge.id !== tempEdgeId
        );

        // If we have a valid target, create the real edge
        if (targetNodeRef.current && targetValid) {
          editor.createEdge(
            nodeId,
            targetNodeRef.current,
            handleId,
            targetHandleRef.current || "default"
          );
        }

        // Clean up refs
        targetNodeRef.current = null;
        targetHandleRef.current = null;

        // Clean up event listeners
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);

        updateCanvas();
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);

      updateCanvas();
    },
    [editor, getParentNodeId, handleId, isValidConnection, updateCanvas]
  );

  return (
    <div
      ref={handleRef}
      data-handle-id={handleId}
      className={className}
      onPointerDown={handlePointerDown}
    />
  );
}
