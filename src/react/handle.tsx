import { useState, useCallback, useRef } from "react";
import { useCanvas } from "./context";
import { generateId } from "../utils";
import type { Point } from "../types";

export interface HandleProps {
  /**
   * The ID of the handle, used to identify connection points
   */
  id?: string;
  /**
   * Position of the handle, default is 'right'
   */
  position?: "top" | "right" | "bottom" | "left";
  /**
   * Type of the handle, can be used for styling or validation
   */
  type?: string;
  /**
   * Connection validation function
   */
  isValidConnection?: (nodeId: string, handleId: string) => boolean;
  /**
   * Custom style for the handle
   */
  style?: React.CSSProperties;
  /**
   * Custom className for the handle
   */
  className?: string;
}

export function Handle({
  id = "default",
  position = "right",
  type = "default",
  isValidConnection,
  style,
  className,
}: HandleProps) {
  const { editor, updateCanvas } = useCanvas();
  const [isDragging, setIsDragging] = useState(false);
  const [targetValid, setTargetValid] = useState(true);
  const handleRef = useRef<HTMLDivElement>(null);
  const targetNodeRef = useRef<string | null>(null);
  const targetHandleRef = useRef<string | null>(null);

  // Get the node ID this handle belongs to by traversing up the DOM
  const getParentNodeId = useCallback(() => {
    if (!handleRef.current) return null;

    let element = handleRef.current.parentElement;
    while (element) {
      const dataNodeId = element.getAttribute("data-node-id");
      if (dataNodeId) {
        return dataNodeId;
      }
      element = element.parentElement;
    }
    return null;
  }, []);

  // Calculate position styles for each handle position
  const getPositionStyles = useCallback(() => {
    switch (position) {
      case "top":
        return { top: -5, left: "50%", transform: "translateX(-50%)" };
      case "right":
        return { right: -5, top: "50%", transform: "translateY(-50%)" };
      case "bottom":
        return { bottom: -5, left: "50%", transform: "translateX(-50%)" };
      case "left":
        return { left: -5, top: "50%", transform: "translateY(-50%)" };
      default:
        return { right: -5, top: "50%", transform: "translateY(-50%)" };
    }
  }, [position]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const nodeId = getParentNodeId();
      if (!nodeId) return;

      setIsDragging(true);

      // Create a temporary edge for visual feedback during dragging
      const dummyEdgeId = generateId("edge-temp-");
      const dummyNodeId = generateId("node-temp-");

      // Add dummy node at cursor position for the edge to connect to
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const point: Point = {
        x: e.clientX,
        y: e.clientY,
      };

      const dummyNode = editor.createNode(
        "__dummy__",
        {
          x: point.x,
          y: point.y,
        },
        {},
        1,
        1
      );

      // Create a temporary edge
      const tempEdge = editor.createEdge(
        nodeId,
        dummyNode.id,
        id,
        "default",
        "default"
      );

      // Setup global mouse move and mouse up handlers
      const handleMouseMove = (moveEvent: MouseEvent) => {
        // Update the position of the dummy node to follow the cursor
        const node = editor.state.getNodeById(dummyNode.id);
        if (node) {
          editor.moveNode(dummyNode.id, {
            x: moveEvent.clientX,
            y: moveEvent.clientY,
          });

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

      const handleMouseUp = () => {
        setIsDragging(false);

        // Remove the temporary edge and node
        editor.deleteEdge(tempEdge?.id || "");
        editor.deleteNode(dummyNode.id);

        // If we have a valid target, create the real edge
        if (targetNodeRef.current && targetValid) {
          editor.createEdge(
            nodeId,
            targetNodeRef.current,
            id,
            targetHandleRef.current || "default"
          );
        }

        // Clean up refs
        targetNodeRef.current = null;
        targetHandleRef.current = null;

        // Clean up event listeners
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);

        updateCanvas();
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      updateCanvas();
    },
    [editor, getParentNodeId, id, isValidConnection, updateCanvas]
  );

  // Set base styles for the handle
  const baseStyles: React.CSSProperties = {
    position: "absolute",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: targetValid ? "#3182ce" : "#e53e3e",
    border: "2px solid white",
    cursor: "crosshair",
    zIndex: 5,
    ...getPositionStyles(),
    ...(isDragging
      ? { transform: `${getPositionStyles().transform} scale(1.2)` }
      : {}),
    ...style,
  };

  return (
    <div
      ref={handleRef}
      data-handle-id={id}
      data-handle-type={type}
      className={className}
      style={baseStyles}
      onMouseDown={handleMouseDown}
    />
  );
}
