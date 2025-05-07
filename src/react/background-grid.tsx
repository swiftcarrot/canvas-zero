import { useCallback } from "react";
import type { CanvasState } from "../state";

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
      backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
      backgroundPosition: `${
        (-viewport.rect.x * viewport.zoom) % (20 * viewport.zoom)
      }px ${(-viewport.rect.y * viewport.zoom) % (20 * viewport.zoom)}px`,
      transform: "translate(0px, 0px)",
    } as const;
  }, [viewport]);

  return <div style={calculateGridStyle()} />;
}
