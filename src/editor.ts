import { CanvasState, type CanvasStateOptions } from "./state";
import type { Node, Edge, Point, Box, Handle } from "./types";
import { createElbowConnector } from "./elbow-connector";
import { generateId, GRID_SIZE, rectanglesOverlap } from "./utils";
import { EventEmitter } from "./event-emitter";

export class Editor {
  state: CanvasState;
  container: HTMLElement;
  events: EventEmitter;

  constructor(options: CanvasStateOptions = {}, container: HTMLElement) {
    this.state = new CanvasState(options);
    this.events = new EventEmitter();
    this.container = container;
  }

  public snapToGrid(value: number): number {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }

  public snapPointToGrid(point: Point): Point {
    return {
      x: this.snapToGrid(point.x),
      y: this.snapToGrid(point.y),
    };
  }

  private triggerUpdate(eventType: string, payload?: any) {
    this.events.emit("canvas:update", { type: eventType, ...payload });
  }

  createNode(
    type: string,
    position: Point,
    data: any = {},
    width = 100,
    height = 80
  ): Node {
    const snappedPosition = this.snapPointToGrid(position);
    const snappedWidth = this.snapToGrid(width);
    const snappedHeight = this.snapToGrid(height);

    const node: Node = {
      id: generateId("node-"),
      type,
      position: snappedPosition,
      width: snappedWidth,
      height: snappedHeight,
      data,
      handles: {},
    };

    this.state.nodes.push(node);
    this.triggerUpdate("node-created", { node });

    return node;
  }

  createEdge(
    fromNodeId: string,
    toNodeId: string,
    fromHandleId: string = "default",
    toHandleId: string = "default",
    type: string = "default"
  ): Edge | null {
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
    this.triggerUpdate("edge-created", { edge });

    return edge;
  }

  moveNodes(nodeIds: string[], deltaX: number, deltaY: number) {
    const snappedDeltaX = this.snapToGrid(deltaX);
    const snappedDeltaY = this.snapToGrid(deltaY);

    nodeIds.forEach((nodeId) => {
      const node = this.state.getNodeById(nodeId);
      if (node) {
        node.position = this.snapPointToGrid({
          x: node.position.x + snappedDeltaX,
          y: node.position.y + snappedDeltaY,
        });
      }
    });

    nodeIds.forEach((nodeId) => this.updateEdgesForNode(nodeId));
    this.triggerUpdate("nodes-moved", {
      nodeIds,
      delta: { x: snappedDeltaX, y: snappedDeltaY },
    });
  }

  private updateEdgesForNode(nodeId: string) {
    const edges = this.state.getEdgesByNodeId(nodeId);
    for (const edge of edges) {
      this.renderEdge(edge);
    }
  }

  // Resize a node
  resizeNode(nodeId: string, width: number, height: number) {
    const node = this.state.getNodeById(nodeId);
    if (node) {
      node.width = this.snapToGrid(width);
      node.height = this.snapToGrid(height);
      // Update any connected edges as the connection points may have changed
      this.updateEdgesForNode(nodeId);
      this.triggerUpdate("node-resized", {
        nodeId,
        size: { width: node.width, height: node.height },
      });
    }
  }

  // Delete a node and its connected edges
  deleteNode(nodeId: string) {
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

    this.triggerUpdate("node-deleted", { nodeId });
  }

  // Delete an edge
  deleteEdge(edgeId: string) {
    const edge = this.state.getEdgeById(edgeId);
    this.state.edges = this.state.edges.filter((edge) => edge.id !== edgeId);
    this.state.selection.edgeIds = this.state.selection.edgeIds.filter(
      (id) => id !== edgeId
    );

    this.triggerUpdate("edge-deleted", { edgeId });
  }

  // Zoom the canvas view
  zoom(scale: number, center?: Point) {
    // If no center is provided, use the center of the viewport
    if (!center && this.container) {
      const rect = this.container.getBoundingClientRect();
      center = {
        x: rect.width / 2,
        y: rect.height / 2,
      };
    } else if (!center) {
      center = {
        x: this.state.viewport.box.w / 2,
        y: this.state.viewport.box.h / 2,
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
    this.state.viewport.box = {
      x:
        centerInCanvas.x -
        (centerInCanvas.x - this.state.viewport.box.x) / zoomFactor,
      y:
        centerInCanvas.y -
        (centerInCanvas.y - this.state.viewport.box.y) / zoomFactor,
      w: this.state.viewport.box.w,
      h: this.state.viewport.box.h,
    };

    // Set the new zoom level
    this.state.viewport.zoom = newZoom;
    this.triggerUpdate("viewport-changed", { viewport: this.state.viewport });
  }

  // Pan the canvas view
  pan(deltaX: number, deltaY: number) {
    this.state.viewport.box = {
      ...this.state.viewport.box,
      x: this.state.viewport.box.x - deltaX / this.state.viewport.zoom,
      y: this.state.viewport.box.y - deltaY / this.state.viewport.zoom,
    };

    this.triggerUpdate("viewport-changed", { viewport: this.state.viewport });
  }

  // Select nodes and edges (can be multiple)
  select(
    nodeIds: string[] = [],
    edgeIds: string[] = [],
    exclusive: boolean = true
  ) {
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

    this.triggerUpdate("selection-changed", {
      selection: this.state.selection,
    });
  }

  selectAll() {
    const nodeIds = this.state.nodes.map((node) => node.id);
    const edgeIds = this.state.edges.map((edge) => edge.id);
    this.select(nodeIds, edgeIds, true);
  }

  // Select items by area (a rectangular selection box)
  selectByRect(rect: Box) {
    // Convert screen coordinates to canvas coordinates if needed
    const snappedRect: Box = {
      x: this.snapToGrid(rect.x),
      y: this.snapToGrid(rect.y),
      w: this.snapToGrid(rect.w),
      h: this.snapToGrid(rect.h),
    };

    // Find nodes within the selection rectangle
    const selectedNodes = this.state.nodes.filter((node) => {
      const nodeRect: Box = {
        x: node.position.x,
        y: node.position.y,
        w: node.width || 0,
        h: node.height || 0,
      };

      return rectanglesOverlap(snappedRect, nodeRect);
    });

    // Find edges within the selection rectangle (simplified for now)
    // A more accurate version would check if the edge path intersects with the rectangle
    const selectedEdges = this.state.edges.filter((edge) => {
      if (!edge.fromNodeId || !edge.toNodeId) return false; // Add this check
      const fromNode = this.state.getNodeById(edge.fromNodeId);
      const toNode = this.state.getNodeById(edge.toNodeId);

      if (!fromNode || !toNode) return false;

      const fromRect: Box = {
        x: fromNode.position.x,
        y: fromNode.position.y,
        w: fromNode.width || 0,
        h: fromNode.height || 0,
      };

      const toRect: Box = {
        x: toNode.position.x,
        y: toNode.position.y,
        w: toNode.width || 0,
        h: toNode.height || 0,
      };

      // If both connected nodes are in selection, include the edge
      return (
        rectanglesOverlap(snappedRect, fromRect) &&
        rectanglesOverlap(snappedRect, toRect)
      );
    });

    // Update selection
    this.select(
      selectedNodes.map((node) => node.id),
      selectedEdges.map((edge) => edge.id),
      true // Replace current selection
    );

    // Update selection box
    this.state.selection.box = snappedRect;
    this.triggerUpdate("selection-rect-changed", { rect: snappedRect });
  }

  // Start dragging a node
  startNodeDrag(nodeId: string, point: Point) {
    this.state.draggingNode = nodeId;
    this.state.isDragging = true;
    this.state.lastMousePosition = this.snapPointToGrid(point);

    // If node is not in current selection, select it exclusively
    if (!this.state.selection.nodeIds.includes(nodeId)) {
      this.select([nodeId], [], true);
    }

    this.triggerUpdate("drag-started", { nodeId, point });
  }

  dragNodes(point: Point) {
    if (!this.state.isDragging || !this.state.lastMousePosition) return;

    const snappedPoint = this.snapPointToGrid(point);

    const deltaX = snappedPoint.x - this.state.lastMousePosition.x;
    const deltaY = snappedPoint.y - this.state.lastMousePosition.y;

    this.moveNodes(this.state.selection.nodeIds, deltaX, deltaY);

    this.state.lastMousePosition = snappedPoint;
  }

  // Stop dragging
  stopDrag() {
    this.state.isDragging = false;
    this.state.draggingNode = null;
    this.state.draggingEdge = null;
    this.state.lastMousePosition = null;

    this.triggerUpdate("drag-stopped");
  }

  // Start panning
  startPan(point: Point) {
    this.state.isPanning = true;
    this.state.lastMousePosition = point;

    this.triggerUpdate("pan-started", { point });
  }

  continuePan(point: Point) {
    if (!this.state.isPanning || !this.state.lastMousePosition) return;

    const deltaX = point.x - this.state.lastMousePosition.x;
    const deltaY = point.y - this.state.lastMousePosition.y;

    this.pan(deltaX, deltaY);
    this.state.lastMousePosition = point;

    this.triggerUpdate("pan-continued", { point });
  }

  stopPan() {
    this.state.isPanning = false;
    this.state.lastMousePosition = null;

    this.triggerUpdate("pan-stopped");
  }

  updateHandle(handle: Handle) {
    const node = this.state.getNodeById(handle.nodeId)!;
    node.handles = node.handles || {};
    node.handles[handle.id] = handle;

    // TODO: check if edge is connected to this handle
    for (const edge of this.state.edges) {
      if (edge.fromHandleId === handle.id || edge.toHandleId === handle.id) {
        this.renderEdge(edge);
      }
    }
  }

  renderEdge(edge: Edge) {
    let p1 = edge.from;
    let p2 = edge.to;
    let rect1: Box | undefined;
    let rect2: Box | undefined;

    if (edge.fromHandleId) {
      const node = this.state.getNodeById(edge.fromNodeId!);
      if (node && node.handles) {
        const handle = node.handles[edge.fromHandleId];
        if (handle) {
          // TODO: container offset
          p1 = {
            x: node.position.x + handle.box.x + handle.box.w / 2,
            y: node.position.y + handle.box.y + handle.box.h / 2,
          };
          // TODO: node.box
          rect1 = {
            x: node.position.x,
            y: node.position.y,
            w: node.width,
            h: node.height,
          };
        }
      }
    }

    if (edge.toHandleId) {
      const node = this.state.getNodeById(edge.toNodeId!);
      if (node && node.handles) {
        const handle = node.handles[edge.toHandleId];
        if (handle) {
          p2 = {
            x: node.position.x + handle.box.x + handle.box.w / 2,
            y: node.position.y + handle.box.y + handle.box.h / 2,
          };
          rect2 = {
            x: node.position.x,
            y: node.position.y,
            w: node.width,
            h: node.height,
          };
        }
      }
    }

    if (p1 && p2) {
      edge.points = createElbowConnector(p1, p2, rect1, rect2);
      this.triggerUpdate("edge-updated", { edge });
    }
  }

  createGroup(nodeIds?: string[], edgeIds?: string[]): Node | null {
    const selectedNodeIds = nodeIds || [...this.state.selection.nodeIds];
    const selectedEdgeIds = edgeIds || [...this.state.selection.edgeIds];

    if (selectedNodeIds.length <= 1) {
      return null; // Need at least 2 nodes to form a group
    }

    // Find the bounds of all selected nodes
    const selectedNodes = selectedNodeIds
      .map((id) => this.state.getNodeById(id))
      .filter(Boolean) as Node[];

    if (selectedNodes.length === 0) {
      return null;
    }

    // Calculate the bounding box that contains all selected nodes
    const minX = Math.min(...selectedNodes.map((node) => node.position.x));
    const minY = Math.min(...selectedNodes.map((node) => node.position.y));
    const maxX = Math.max(
      ...selectedNodes.map((node) => node.position.x + (node.width || 0))
    );
    const maxY = Math.max(
      ...selectedNodes.map((node) => node.position.y + (node.height || 0))
    );

    // Add some padding around the group
    const padding = this.snapToGrid(20); // Snap padding
    const groupWidth = this.snapToGrid(maxX - minX + padding * 2);
    const groupHeight = this.snapToGrid(maxY - minY + padding * 2);
    const groupPosition = this.snapPointToGrid({
      x: minX - padding,
      y: minY - padding,
    });

    // Create the group node
    const groupNode: Node = {
      id: generateId("group-"),
      type: "group",
      position: groupPosition,
      width: groupWidth,
      height: groupHeight,
      data: {
        label: "Group",
        childNodeIds: selectedNodeIds,
        childEdgeIds: selectedEdgeIds,
      },
      handles: {},
    };

    // Adjust positions of child nodes to be relative to the group
    // This keeps their visual positions the same but makes them children of the group
    selectedNodes.forEach((node) => {
      node.data = {
        ...node.data,
        parentId: groupNode.id,
        originalPosition: { ...node.position }, // Store original position
      };
    });

    // Add the group node to the state
    this.state.nodes.push(groupNode);

    // Select only the group node
    this.select([groupNode.id], [], true);

    this.triggerUpdate("group-created", { group: groupNode });

    return groupNode;
  }

  // Ungroup a selected group node
  ungroup(): Node[] | null {
    const selectedNodeIds = [...this.state.selection.nodeIds];

    if (selectedNodeIds.length !== 1) {
      return null; // Can only ungroup one group at a time
    }
    const groupId = selectedNodeIds[0];
    if (!groupId) {
      // Should not happen due to length check, but good for type safety
      return null;
    }

    const groupNode = this.state.getNodeById(groupId);

    if (
      !groupNode ||
      groupNode.type !== "group" ||
      !groupNode.data.childNodeIds
    ) {
      return null; // Not a group node
    }

    const childNodeIds = groupNode.data.childNodeIds as string[];
    const childNodes = childNodeIds
      .map((id) => this.state.getNodeById(id))
      .filter(Boolean) as Node[];

    if (childNodes.length === 0) {
      return null;
    }

    // Remove parent reference from child nodes
    childNodes.forEach((node) => {
      if (node.data.parentId === groupNode.id) {
        const { parentId, originalPosition, ...rest } = node.data;
        node.data = rest;
      }
    });

    // Remove the group node
    this.state.nodes = this.state.nodes.filter(
      (node) => node.id !== groupNode.id
    );

    // Select the ungrouped nodes
    this.select(childNodeIds, [], true);

    this.triggerUpdate("group-deleted", {
      groupId: groupNode.id,
      childNodeIds,
    });

    return childNodes;
  }

  updateState(state: Partial<CanvasStateOptions>) {
    if (state.nodes) {
      this.state.nodes = state.nodes;
    }
    if (state.edges) {
      this.state.edges = state.edges;
    }
    if (state.viewport) {
      this.state.viewport = state.viewport;
    }

    // this.triggerUpdate("state-updated", { state });
  }
}
