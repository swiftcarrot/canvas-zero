import { useCallback, useRef } from "react";
import type { Point, Box } from "../types";

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
  box: Box;
  isSelected: boolean;
  directions?: ResizeDirection[];
  onResizeStart?: () => void;
  onResize?: (box: Box) => void;
  onResizeEnd?: (box: Box) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Resizable = ({
  box,
  isSelected,
  directions = ["top-left", "top-right", "bottom-left", "bottom-right"],
  onResize,
  onResizeStart,
  onResizeEnd,
  children,
  style,
}: ResizableProps) => {
  const currentDirectionRef = useRef<ResizeDirection | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const startSizeRef = useRef<Box | null>(null);

  const handleResizeStart = useCallback(
    (e: React.PointerEvent, direction: ResizeDirection) => {
      e.stopPropagation();
      currentDirectionRef.current = direction;
      startPointRef.current = { x: e.clientX, y: e.clientY };
      startSizeRef.current = box;
      onResizeStart?.();

      document.addEventListener("pointermove", handleResizeMove);
      document.addEventListener("pointerup", handleResizeEnd);
      document.addEventListener("pointercancel", handleResizeEnd);
    },
    [box, onResizeStart]
  );

  const handleResizeMove = useCallback(
    (e: PointerEvent) => {
      if (
        !currentDirectionRef.current ||
        !startPointRef.current ||
        !startSizeRef.current
      ) {
        return;
      }

      e.stopPropagation();

      const dx = e.clientX - startPointRef.current.x;
      const dy = e.clientY - startPointRef.current.y;

      let width = startSizeRef.current.w;
      let height = startSizeRef.current.h;
      let top = startSizeRef.current.y;
      let left = startSizeRef.current.x;

      const direction = currentDirectionRef.current;

      if (direction.includes("right")) {
        width = startSizeRef.current.w + dx;
      } else if (direction.includes("left")) {
        left = startSizeRef.current.x + dx;
        width = startSizeRef.current.w - dx;
      }
      if (direction.includes("bottom")) {
        height = startSizeRef.current.h + dy;
      } else if (direction.includes("top")) {
        top = startSizeRef.current.y + dy;
        height = startSizeRef.current.h - dy;
      }

      onResize?.({
        x: left,
        y: top,
        w: width,
        h: height,
      });
    },
    [onResize]
  );

  // Handle resize pointer up
  const handleResizeEnd = useCallback(
    (e: PointerEvent) => {
      if (!currentDirectionRef.current) return;

      e.stopPropagation();

      currentDirectionRef.current = null;

      if (startSizeRef.current) {
        // TODO: onResizeEnd should be called with the final box
      }

      startPointRef.current = null;
      startSizeRef.current = null;

      document.removeEventListener("pointermove", handleResizeMove);
      document.removeEventListener("pointerup", handleResizeEnd);
      document.removeEventListener("pointercancel", handleResizeEnd);
    },
    [onResizeEnd]
  );

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
        {directions.includes("top-left") && (
          <div
            style={{
              ...handleStyle,
              top: -handleSize / 2,
              left: -handleSize / 2,
              cursor: "nwse-resize",
            }}
            onPointerDown={(e) => handleResizeStart(e, "top-left")}
          />
        )}
        {directions.includes("top") && (
          <div
            style={{
              ...handleStyle,
              top: -handleSize / 2,
              left: "50%",
              transform: "translateX(-50%)",
              cursor: "ns-resize",
            }}
            onPointerDown={(e) => handleResizeStart(e, "top")}
          />
        )}
        {directions.includes("top-right") && (
          <div
            style={{
              ...handleStyle,
              top: -handleSize / 2,
              right: -handleSize / 2,
              cursor: "nesw-resize",
            }}
            onPointerDown={(e) => handleResizeStart(e, "top-right")}
          />
        )}
        {directions.includes("left") && (
          <div
            style={{
              ...handleStyle,
              top: "50%",
              left: -handleSize / 2,
              transform: "translateY(-50%)",
              cursor: "ew-resize",
            }}
            onPointerDown={(e) => handleResizeStart(e, "left")}
          />
        )}
        {directions.includes("right") && (
          <div
            style={{
              ...handleStyle,
              top: "50%",
              right: -handleSize / 2,
              transform: "translateY(-50%)",
              cursor: "ew-resize",
            }}
            onPointerDown={(e) => handleResizeStart(e, "right")}
          />
        )}
        {directions.includes("bottom-left") && (
          <div
            style={{
              ...handleStyle,
              bottom: -handleSize / 2,
              left: -handleSize / 2,
              cursor: "nesw-resize",
            }}
            onPointerDown={(e) => handleResizeStart(e, "bottom-left")}
          />
        )}
        {directions.includes("bottom") && (
          <div
            style={{
              ...handleStyle,
              bottom: -handleSize / 2,
              left: "50%",
              transform: "translateX(-50%)",
              cursor: "ns-resize",
            }}
            onPointerDown={(e) => handleResizeStart(e, "bottom")}
          />
        )}
        {directions.includes("bottom-right") && (
          <div
            style={{
              ...handleStyle,
              bottom: -handleSize / 2,
              right: -handleSize / 2,
              cursor: "nwse-resize",
            }}
            onPointerDown={(e) => handleResizeStart(e, "bottom-right")}
          />
        )}
      </>
    );
  };

  return (
    <div
      style={{
        position: "relative",
        width: box.w,
        height: box.h,
        ...style,
      }}
    >
      {children}
      {renderResizeHandles()}
    </div>
  );
};
