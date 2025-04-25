import {
  CanvasState,
  type Node,
  type Edge,
  type CanvasStateOptions,
} from "./state";
import type { Point, Rectangle } from "./types";
import { createElbowConnector } from "./elbow-connector";
import { generateId, rectanglesOverlap } from "./utils";

export class Editor {
  state: CanvasState;
  container: HTMLElement | null = null;

  constructor(options: CanvasStateOptions = {}) {
    this.state = new CanvasState(options);
  }

  setContainer(container: HTMLElement) {
    this.container = container;
  }

  createNode(
    type: string,
    position: Point,
    data: any = {},
    width = 100,
    height = 80
  ): Node {
    const node: Node = {
      id: generateId("node-"),
      type,
      position,
      width,
      height,
      data,
    };

    this.state.nodes.push(node);
    return node;
  }

  createEdge(
    fromNodeId: string,
    toNodeId: string,
    fromHandleId: string = "default",
    toHandleId: string = "default",
    type: string = "default"
  ): Edge | null {
    // Verify that both nodes exist
    const fromNode = this.state.getNodeById(fromNodeId);
    const toNode = this.state.getNodeById(toNodeId);

    if (!fromNode || !toNode) {
      return null;
    }

    const edge: Edge = {
      id: generateId("edge-"),
      type,
      fromNodeId,
      toNodeId,
      fromHandleId,
      toHandleId,
    };

    this.state.edges.push(edge);
    return edge;
  }

  // Move a node to a new position
  moveNode(nodeId: string, newPosition: Point): void {
    const node = this.state.getNodeById(nodeId);
    if (node) {
      node.position = newPosition;
      // Update any connected edges
      this.updateEdgesForNode(nodeId);
    }
  }

  // Move multiple nodes at once (useful for selection)
  moveNodes(nodeIds: string[], deltaX: number, deltaY: number): void {
    nodeIds.forEach((nodeId) => {
      const node = this.state.getNodeById(nodeId);
      if (node) {
        node.position = {
          x: node.position.x + deltaX,
          y: node.position.y + deltaY,
        };
      }
    });

    // Update any connected edges
    nodeIds.forEach((nodeId) => this.updateEdgesForNode(nodeId));
  }

  // Update edges connected to a specific node
  private updateEdgesForNode(nodeId: string): void {
    const edges = this.state.getEdgesByNodeId(nodeId);
    // In a real implementation, this would recompute the path or connection points
    // For now, we're just making sure it's ready for future implementation
  }

  // Resize a node
  resizeNode(nodeId: string, width: number, height: number): void {
    const node = this.state.getNodeById(nodeId);
    if (node) {
      node.width = width;
      node.height = height;
      // Update any connected edges as the connection points may have changed
      this.updateEdgesForNode(nodeId);
    }
  }

  // Delete a node and its connected edges
  deleteNode(nodeId: string): void {
    // Delete any connected edges first
    const connectedEdges = this.state.getEdgesByNodeId(nodeId);
    connectedEdges.forEach((edge) => {
      this.deleteEdge(edge.id);
    });

    // Now remove the node
    this.state.nodes = this.state.nodes.filter((node) => node.id !== nodeId);

    // Update selection if needed
    this.state.selection.nodeIds = this.state.selection.nodeIds.filter(
      (id) => id !== nodeId
    );
  }

  // Delete an edge
  deleteEdge(edgeId: string): void {
    this.state.edges = this.state.edges.filter((edge) => edge.id !== edgeId);

    // Update selection if needed
    this.state.selection.edgeIds = this.state.selection.edgeIds.filter(
      (id) => id !== edgeId
    );
  }

  // Zoom the canvas view
  zoom(scale: number, center?: Point): void {
    // If no center is provided, use the center of the viewport
    if (!center && this.container) {
      const rect = this.container.getBoundingClientRect();
      center = {
        x: rect.width / 2,
        y: rect.height / 2,
      };
    } else if (!center) {
      center = {
        x: this.state.viewport.rect.width / 2,
        y: this.state.viewport.rect.height / 2,
      };
    }

    // Convert center point to canvas coordinates before zoom
    const centerInCanvas = this.state.screenToCanvas(center);

    // Apply zoom
    const newZoom = Math.min(
      Math.max(0.1, this.state.viewport.zoom * scale),
      5
    ); // Limit zoom to reasonable bounds
    const zoomFactor = newZoom / this.state.viewport.zoom;

    // Update the viewport position to keep the center point fixed
    this.state.viewport.rect = {
      x:
        centerInCanvas.x -
        (centerInCanvas.x - this.state.viewport.rect.x) / zoomFactor,
      y:
        centerInCanvas.y -
        (centerInCanvas.y - this.state.viewport.rect.y) / zoomFactor,
      width: this.state.viewport.rect.width,
      height: this.state.viewport.rect.height,
    };

    // Set the new zoom level
    this.state.viewport.zoom = newZoom;
  }

  // Pan the canvas view
  pan(deltaX: number, deltaY: number): void {
    this.state.viewport.rect = {
      ...this.state.viewport.rect,
      x: this.state.viewport.rect.x - deltaX / this.state.viewport.zoom,
      y: this.state.viewport.rect.y - deltaY / this.state.viewport.zoom,
    };
  }

  // Select nodes and edges (can be multiple)
  select(
    nodeIds: string[] = [],
    edgeIds: string[] = [],
    exclusive: boolean = true
  ): void {
    if (exclusive) {
      this.state.clearSelection();
    }

    // Add the new selections
    this.state.selection.nodeIds = [
      ...this.state.selection.nodeIds,
      ...nodeIds.filter((id) => !this.state.selection.nodeIds.includes(id)),
    ];

    this.state.selection.edgeIds = [
      ...this.state.selection.edgeIds,
      ...edgeIds.filter((id) => !this.state.selection.edgeIds.includes(id)),
    ];
  }

  // Select all nodes and edges
  selectAll(): void {
    const nodeIds = this.state.nodes.map((node) => node.id);
    const edgeIds = this.state.edges.map((edge) => edge.id);
    this.select(nodeIds, edgeIds, true);
  }

  // Select items by area (a rectangular selection box)
  selectByRect(rect: Rectangle): void {
    // Convert screen coordinates to canvas coordinates if needed
    const canvasRect = rect;

    // Find nodes within the selection rectangle
    const selectedNodes = this.state.nodes.filter((node) => {
      const nodeRect: Rectangle = {
        x: node.position.x,
        y: node.position.y,
        width: node.width || 0,
        height: node.height || 0,
      };

      return rectanglesOverlap(canvasRect, nodeRect);
    });

    // Find edges within the selection rectangle (simplified for now)
    // A more accurate version would check if the edge path intersects with the rectangle
    const selectedEdges = this.state.edges.filter((edge) => {
      const fromNode = this.state.getNodeById(edge.fromNodeId);
      const toNode = this.state.getNodeById(edge.toNodeId);

      if (!fromNode || !toNode) return false;

      const fromRect: Rectangle = {
        x: fromNode.position.x,
        y: fromNode.position.y,
        width: fromNode.width || 0,
        height: fromNode.height || 0,
      };

      const toRect: Rectangle = {
        x: toNode.position.x,
        y: toNode.position.y,
        width: toNode.width || 0,
        height: toNode.height || 0,
      };

      // If both connected nodes are in selection, include the edge
      return (
        rectanglesOverlap(canvasRect, fromRect) &&
        rectanglesOverlap(canvasRect, toRect)
      );
    });

    // Update selection
    this.select(
      selectedNodes.map((node) => node.id),
      selectedEdges.map((edge) => edge.id),
      true // Replace current selection
    );

    // Update selection box
    this.state.selection.box = rect;
  }

  // Start dragging a node
  startNodeDrag(nodeId: string, point: Point): void {
    this.state.draggingNode = nodeId;
    this.state.isDragging = true;
    this.state.lastMousePosition = point;

    // If node is not in current selection, select it exclusively
    if (!this.state.selection.nodeIds.includes(nodeId)) {
      this.select([nodeId], [], true);
    }
  }

  // Continue dragging nodes
  dragNodes(point: Point): void {
    if (!this.state.isDragging || !this.state.lastMousePosition) return;

    const deltaX = point.x - this.state.lastMousePosition.x;
    const deltaY = point.y - this.state.lastMousePosition.y;

    // Move all selected nodes
    this.moveNodes(this.state.selection.nodeIds, deltaX, deltaY);

    this.state.lastMousePosition = point;
  }

  // Stop dragging
  stopDrag(): void {
    this.state.isDragging = false;
    this.state.draggingNode = null;
    this.state.draggingEdge = null;
    this.state.lastMousePosition = null;
  }

  // Start panning
  startPan(point: Point): void {
    this.state.isPanning = true;
    this.state.lastMousePosition = point;
  }

  // Continue panning
  continuePan(point: Point): void {
    if (!this.state.isPanning || !this.state.lastMousePosition) return;

    const deltaX = point.x - this.state.lastMousePosition.x;
    const deltaY = point.y - this.state.lastMousePosition.y;

    this.pan(deltaX, deltaY);

    this.state.lastMousePosition = point;
  }

  // Stop panning
  stopPan(): void {
    this.state.isPanning = false;
    this.state.lastMousePosition = null;
  }

  // Get the edge path for rendering
  getEdgePath(edge: Edge): Point[] {
    const fromNode = this.state.getNodeById(edge.fromNodeId);
    const toNode = this.state.getNodeById(edge.toNodeId);

    if (!fromNode || !toNode) return [];

    // Simple implementation: connect from center to center
    const fromPoint = {
      x: fromNode.position.x + (fromNode.width || 0) / 2,
      y: fromNode.position.y + (fromNode.height || 0) / 2,
    };

    const toPoint = {
      x: toNode.position.x + (toNode.width || 0) / 2,
      y: toNode.position.y + (toNode.height || 0) / 2,
    };

    // Use the elbow connector algorithm to create a path
    return createElbowConnector(
      fromPoint,
      toPoint,
      {
        x: fromNode.position.x,
        y: fromNode.position.y,
        width: fromNode.width || 0,
        height: fromNode.height || 0,
      },
      {
        x: toNode.position.x,
        y: toNode.position.y,
        width: toNode.width || 0,
        height: toNode.height || 0,
      }
    );
  }

  // Update the editor state with external state
  updateState(state: Partial<CanvasStateOptions>): void {
    if (state.nodes) {
      this.state.nodes = state.nodes;
    }
    if (state.edges) {
      this.state.edges = state.edges;
    }
    if (state.viewport) {
      this.state.viewport = state.viewport;
    }
  }
}
