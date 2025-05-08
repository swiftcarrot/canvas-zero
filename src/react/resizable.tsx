import { useState, useCallback, useRef, useEffect } from "react";
import type { Point } from "../types";
import { snapToGrid } from "../utils";

export type ResizeDirection =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface ResizableProps {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  isSelected: boolean;
  onResize?: (width: number, height: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: (width: number, height: number) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Resizable = ({
  width,
  height,
  minWidth = 50,
  minHeight = 50,
  isSelected,
  onResize,
  onResizeStart,
  onResizeEnd,
  children,
  style,
}: ResizableProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const [currentDirection, setCurrentDirection] =
    useState<ResizeDirection | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const startSizeRef = useRef<{ width: number; height: number } | null>(null);

  // Handle resize pointer down
  const handleResizeStart = useCallback(
    (e: React.PointerEvent, direction: ResizeDirection) => {
      e.stopPropagation();
      setIsResizing(true);
      setCurrentDirection(direction);
      startPointRef.current = { x: e.clientX, y: e.clientY };
      startSizeRef.current = { width, height };
      onResizeStart?.();
    },
    [width, height, onResizeStart]
  );

  // Handle resize pointer move
  const handleResizeMove = useCallback(
    (e: PointerEvent) => {
      if (
        !isResizing ||
        !startPointRef.current ||
        !startSizeRef.current ||
        !currentDirection
      )
        return;

      e.stopPropagation();

      const deltaX = e.clientX - startPointRef.current.x;
      const deltaY = e.clientY - startPointRef.current.y;

      let newWidth = startSizeRef.current.width;
      let newHeight = startSizeRef.current.height;

      // Handle width changes
      if (currentDirection.includes("right")) {
        newWidth = Math.max(startSizeRef.current.width + deltaX, minWidth);
      } else if (currentDirection.includes("left")) {
        newWidth = Math.max(startSizeRef.current.width - deltaX, minWidth);
      }

      // Handle height changes
      if (currentDirection.includes("bottom")) {
        newHeight = Math.max(startSizeRef.current.height + deltaY, minHeight);
      } else if (currentDirection.includes("top")) {
        newHeight = Math.max(startSizeRef.current.height - deltaY, minHeight);
      }

      // Snap dimensions to grid
      const snappedWidth = snapToGrid(newWidth);
      const snappedHeight = snapToGrid(newHeight);

      onResize?.(snappedWidth, snappedHeight);
    },
    [isResizing, currentDirection, minWidth, minHeight, onResize]
  );

  // Handle resize pointer up
  const handleResizeEnd = useCallback(
    (e: PointerEvent) => {
      if (!isResizing) return;

      e.stopPropagation();
      setIsResizing(false);
      setCurrentDirection(null);

      // Call onResizeEnd with final dimensions
      if (startSizeRef.current) {
        // Make sure final dimensions are also snapped to grid
        const snappedWidth = snapToGrid(width);
        const snappedHeight = snapToGrid(height);
        onResizeEnd?.(snappedWidth, snappedHeight);
      }

      startPointRef.current = null;
      startSizeRef.current = null;
    },
    [isResizing, width, height, onResizeEnd]
  );

  // Add and remove document event listeners when resizing state changes
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("pointermove", handleResizeMove);
      document.addEventListener("pointerup", handleResizeEnd);
      document.addEventListener("pointercancel", handleResizeEnd);
    } else {
      document.removeEventListener("pointermove", handleResizeMove);
      document.removeEventListener("pointerup", handleResizeEnd);
      document.removeEventListener("pointercancel", handleResizeEnd);
    }

    return () => {
      document.removeEventListener("pointermove", handleResizeMove);
      document.removeEventListener("pointerup", handleResizeEnd);
      document.removeEventListener("pointercancel", handleResizeEnd);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Render resize handles only when selected
  const renderResizeHandles = () => {
    if (!isSelected) return null;

    const handleSize = 7;
    const handleStyle: React.CSSProperties = {
      position: "absolute",
      width: handleSize,
      height: handleSize,
      backgroundColor: "#999999",
      borderRadius: "50%",
      zIndex: 2,
    };

    return (
      <>
        <div
          style={{
            ...handleStyle,
            top: -handleSize / 2,
            left: -handleSize / 2,
            cursor: "nwse-resize",
          }}
          onPointerDown={(e) => handleResizeStart(e, "top-left")}
        />
        {/* <div
          style={{
            ...handleStyle,
            top: -handleSize / 2,
            left: "50%",
            transform: "translateX(-50%)",
            cursor: "ns-resize",
          }}
          onPointerDown={(e) => handleResizeStart(e, "top")}
        /> */}
        <div
          style={{
            ...handleStyle,
            top: -handleSize / 2,
            right: -handleSize / 2,
            cursor: "nesw-resize",
          }}
          onPointerDown={(e) => handleResizeStart(e, "top-right")}
        />
        {/* <div
          style={{
            ...handleStyle,
            top: "50%",
            left: -handleSize / 2,
            transform: "translateY(-50%)",
            cursor: "ew-resize",
          }}
          onPointerDown={(e) => handleResizeStart(e, "left")}
        /> */}
        {/* <div
          style={{
            ...handleStyle,
            top: "50%",
            right: -handleSize / 2,
            transform: "translateY(-50%)",
            cursor: "ew-resize",
          }}
          onPointerDown={(e) => handleResizeStart(e, "right")}
        /> */}
        <div
          style={{
            ...handleStyle,
            bottom: -handleSize / 2,
            left: -handleSize / 2,
            cursor: "nesw-resize",
          }}
          onPointerDown={(e) => handleResizeStart(e, "bottom-left")}
        />
        {/* <div
          style={{
            ...handleStyle,
            bottom: -handleSize / 2,
            left: "50%",
            transform: "translateX(-50%)",
            cursor: "ns-resize",
          }}
          onPointerDown={(e) => handleResizeStart(e, "bottom")}
        /> */}
        <div
          style={{
            ...handleStyle,
            bottom: -handleSize / 2,
            right: -handleSize / 2,
            cursor: "nwse-resize",
          }}
          onPointerDown={(e) => handleResizeStart(e, "bottom-right")}
        />
      </>
    );
  };

  return (
    <div
      style={{
        position: "relative",
        width: `${width}px`,
        height: `${height}px`,
        ...style,
      }}
    >
      {children}
      {renderResizeHandles()}
    </div>
  );
};
