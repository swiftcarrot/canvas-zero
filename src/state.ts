import type { Point, Rectangle } from "./types";

// TODO: color palette support

export interface Node {
  id: string;
  type: "text" | "file" | "link" | "group" | string;
  position: Point;
  width?: number;
  height?: number;
  data: any;
}

export interface Edge {
  id: string;
  type: string;
  fromNodeId: string;
  toNodeId: string;
  fromHandleId: string;
  toHandleId: string;
}

export interface Viewport {
  rect: Rectangle;
  zoom: number;
}

export interface Selection {
  nodeIds: string[];
  edgeIds: string[];
  box: Rectangle | null;
}

export interface CanvasStateOptions {
  nodes?: Node[];
  edges?: Edge[];
  viewport?: Viewport;
}

export class CanvasState {
  nodes: Node[] = [];
  edges: Edge[] = [];
  viewport: Viewport;
  selection: Selection;
  draggingNode: string | null = null;
  draggingEdge: string | null = null;
  isDragging: boolean = false;
  isPanning: boolean = false;
  lastMousePosition: Point | null = null;

  constructor(options: CanvasStateOptions = {}) {
    // Initialize with provided values or defaults
    this.nodes = options.nodes || [];
    this.edges = options.edges || [];

    this.viewport = options.viewport || {
      rect: { x: 0, y: 0, width: 1000, height: 1000 },
      zoom: 1,
    };

    this.selection = {
      nodeIds: [],
      edgeIds: [],
      box: null,
    };
  }

  getNodeById(id: string): Node | undefined {
    return this.nodes.find((node) => node.id === id);
  }

  getEdgeById(id: string): Edge | undefined {
    return this.edges.find((edge) => edge.id === id);
  }

  getEdgesByNodeId(nodeId: string): Edge[] {
    return this.edges.filter(
      (edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId
    );
  }

  screenToCanvas(point: Point): Point {
    return {
      x: point.x / this.viewport.zoom + this.viewport.rect.x,
      y: point.y / this.viewport.zoom + this.viewport.rect.y,
    };
  }

  canvasToScreen(point: Point): Point {
    return {
      x: (point.x - this.viewport.rect.x) * this.viewport.zoom,
      y: (point.y - this.viewport.rect.y) * this.viewport.zoom,
    };
  }

  clearSelection() {
    this.selection = {
      nodeIds: [],
      edgeIds: [],
      box: null,
    };
  }

  // Extract state for external consumption
  getSerializableState(): Pick<CanvasState, "nodes" | "edges"> {
    return {
      nodes: this.nodes,
      edges: this.edges,
    };
  }
}
