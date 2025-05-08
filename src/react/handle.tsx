import { useState, useCallback, useRef, useEffect } from "react";
import { useCanvas } from "./context";
import { generateId } from "../utils";

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
  const { editor } = useCanvas();
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
      const [nodeId] = getParentNodeId();
      if (!nodeId) return;

      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const tempEdgeId = generateId("edge-temp-");
      const sourceElement = e.target as HTMLElement;
      const sourceRect = sourceElement.getBoundingClientRect();

      // TODO: container offset for fixing cordinates
      const sourcePoint = editor.snapPointToGrid(
        editor.state.screenToCanvas({
          x: sourceRect.left + sourceRect.width / 2 - 0,
          y: sourceRect.top + sourceRect.height / 2 - 0,
        })
      );

      const targetPoint = editor.snapPointToGrid(
        editor.state.screenToCanvas({
          x: e.clientX - 0,
          y: e.clientY - 0,
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

      editor.createEdge(tempEdge);

      const handlePointerMove = (e: PointerEvent) => {
        const point = editor.snapPointToGrid(
          editor.state.screenToCanvas({
            x: e.clientX,
            y: e.clientY,
          })
        );

        editor.state.edges = editor.state.edges.map((edge) => {
          if (edge.id === tempEdgeId) {
            const newEdge = { ...edge, to: point };
            newEdge.points = editor.getEdgePoints(newEdge);
            return newEdge;
          }
          return edge;
        });
        editor.triggerUpdate("edges");

        const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
        if (elemBelow) {
          const handleElement = elemBelow.closest("[data-handle-id]");
          if (handleElement) {
            const targetNodeId = handleElement
              .closest("[data-node-id]")
              ?.getAttribute("data-node-id");
            const targetHandleId = handleElement.getAttribute("data-handle-id");

            if (targetNodeId && targetNodeId !== nodeId) {
              targetNodeRef.current = targetNodeId;
              targetHandleRef.current = targetHandleId;
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
      };

      const handlePointerUp = () => {
        setIsDragging(false);

        editor.state.edges = editor.state.edges.filter(
          (edge) => edge.id !== tempEdgeId
        );

        if (targetNodeRef.current && targetValid) {
          editor.createEdge({
            fromNodeId: nodeId,
            fromHandleId: handleId,
            toNodeId: targetNodeRef.current,
            toHandleId: targetHandleRef.current || "default",
          });
        }

        editor.triggerUpdate("edges");

        targetNodeRef.current = null;
        targetHandleRef.current = null;

        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [editor, getParentNodeId, handleId, isValidConnection]
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
