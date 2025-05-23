import type { Node, Edge, Point, Viewport, Selection } from "./types";

// TODO: color palette support

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
    this.nodes = options.nodes || [];
    this.edges = options.edges || [];

    this.viewport = options.viewport || {
      box: { x: 0, y: 0, w: 1000, h: 1000 },
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
      x: point.x / this.viewport.zoom + this.viewport.box.x,
      y: point.y / this.viewport.zoom + this.viewport.box.y,
    };
  }

  canvasToScreen(point: Point): Point {
    return {
      x: (point.x - this.viewport.box.x) * this.viewport.zoom,
      y: (point.y - this.viewport.box.y) * this.viewport.zoom,
    };
  }

  clearSelection() {
    this.selection = {
      nodeIds: [],
      edgeIds: [],
      box: null,
    };
  }

  updateNodeData(nodeId: string, data: Record<string, any>) {
    const node = this.getNodeById(nodeId);
    if (node) {
      node.data = { ...node.data, ...data };
    }
  }

  deleteNodeById(nodeId: string) {
    this.nodes = this.nodes.filter((node) => node.id !== nodeId);
    this.edges = this.edges.filter(
      (edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId
    );
  }

  deleteEdgeById(edgeId: string) {
    this.edges = this.edges.filter((edge) => edge.id !== edgeId);
  }
}
