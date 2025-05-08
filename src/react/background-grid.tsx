import { useCallback } from "react";
import type { CanvasState } from "../state";
import { GRID_SIZE } from "../utils";

export interface BackgroundGridProps {
  viewport: CanvasState["viewport"];
}

export function BackgroundGrid({ viewport }: BackgroundGridProps) {
  const calculateGridStyle = useCallback(() => {
    return {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: "radial-gradient(#cbd5e0 1px, transparent 0)",
      backgroundSize: `${GRID_SIZE * viewport.zoom}px ${
        GRID_SIZE * viewport.zoom
      }px`,
      backgroundPosition: `${
        (-viewport.box.x * viewport.zoom) % (GRID_SIZE * viewport.zoom)
      }px ${(-viewport.box.y * viewport.zoom) % (GRID_SIZE * viewport.zoom)}px`,
      transform: "translate(0px, 0px)",
    } as const;
  }, [viewport]);

  return <div style={calculateGridStyle()} />;
}
