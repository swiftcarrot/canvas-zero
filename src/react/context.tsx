import { createContext, useContext } from "react";
import type { Editor } from "../editor";

interface CanvasContextType {
  editor: Editor;
  updateCanvas: () => void;
}

export const CanvasContext = createContext<CanvasContextType | null>(null);

export function useCanvas(): CanvasContextType {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within a Canvas component");
  }
  return context;
}
