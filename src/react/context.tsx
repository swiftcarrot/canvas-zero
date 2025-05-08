import { createContext, useContext, useSyncExternalStore } from "react";
import type { Editor } from "../editor";
import type { CanvasState } from "../canvas-state";

interface CanvasContextType {
  editor: Editor;
}

export const CanvasContext = createContext<CanvasContextType | null>(null);

export function useCanvas(): CanvasContextType {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within a Canvas component");
  }
  return context;
}

export function useEditorState<T>(
  selector: (state: CanvasState) => T
): T | null {
  const { editor } = useContext(CanvasContext)!;

  return useSyncExternalStore(
    (callback) => {
      const unsubscribe = editor.events.on("canvas:update", callback);
      return unsubscribe;
    },
    () => selector(editor.state)
  );
}
