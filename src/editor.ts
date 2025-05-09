import { CanvasState, type CanvasStateOptions } from "./canvas-state";
import type { Node, Edge, Point, Box, HandleBox } from "./types";
import { createElbowConnector } from "./elbow-connector";
import { generateId, GRID_SIZE, rectanglesOverlap } from "./utils";
import { EventEmitter } from "./event-emitter";
import { UndoStack } from "./undo-stack";

export class Editor {
  state: CanvasState;
  // container: HTMLElement;
  events: EventEmitter;
  undoStack: UndoStack;

  constructor(options: CanvasStateOptions = {}) {
    this.state = new CanvasState(options);
    this.events = new EventEmitter();
    this.undoStack = new UndoStack();
    // this.container = container;
    // TODO: track container offset and size
  }

  // TODO: add support for different grid sizes
  public snapToGrid(value: number): number {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }

  public snapPointToGrid(point: Point): Point {
    return {
      x: this.snapToGrid(point.x),
      y: this.snapToGrid(point.y),
    };
  }

  // TODO: should combine multiple consecutive updates
  triggerUpdate(eventType: string, payload?: any) {
    this.events.emit("canvas:update", { type: eventType, ...payload });
  }

  createNode(node: Partial<Node>) {
    const snappedPosition = this.snapPointToGrid(node.position!);
    const snappedWidth = this.snapToGrid(node.width!);
    const snappedHeight = this.snapToGrid(node.height!);

    const newNode: Node = {
      id: generateId("node-"),
      type: node.type!,
      position: snappedPosition,
      width: snappedWidth,
      height: snappedHeight,
      data: node.data!,
      handles: {},
    };

    this.undoStack.push(
      () => {
        this.state.nodes = this.state.nodes.concat([newNode]);
        this.triggerUpdate("node-created", { node: newNode });
      },
      () => {
        this.state.nodes = this.state.nodes.filter((n) => n.id !== newNode.id);
        this.triggerUpdate("node-deleted", { nodeId: newNode.id });
      },
      newNode
    );

    return node;
  }

  createEdge(edge: Partial<Edge>) {
    const newEdge = {
      id: generateId("edge-"),
      ...edge,
    } as Edge;

    this.undoStack.push(
      () => {
        this.state.edges = this.state.edges.concat([newEdge]);
        this.triggerUpdate("edge-created", { edge: newEdge });
      },
      () => {
        this.state.edges = this.state.edges.filter((e) => e.id !== newEdge.id);
        this.triggerUpdate("edge-deleted", { edgeId: newEdge.id });
      },
      newEdge
    );

    return edge;
  }

  moveNodes(nodeIds: string[], deltaX: number, deltaY: number) {
    // TODO: create undo stack if moving ends
    const snappedDeltaX = this.snapToGrid(deltaX);
    const snappedDeltaY = this.snapToGrid(deltaY);

    // Expand nodeIds to include children of group nodes
    const allNodeIds = new Set<string>(nodeIds);
    for (const nodeId of nodeIds) {
      const node = this.state.getNodeById(nodeId);
      // If this is a group node, include all its children
      if (node?.type === "group" && node.data.childNodeIds) {
        const childNodeIds = node.data.childNodeIds as string[];
        childNodeIds.forEach((id) => allNodeIds.add(id));
      }
    }

    const finalNodeIds = Array.from(allNodeIds);

    this.state.nodes = this.state.nodes.map((node) => {
      if (finalNodeIds.includes(node.id)) {
        return {
          ...node,
          position: this.snapPointToGrid({
            x: node.position.x + snappedDeltaX,
            y: node.position.y + snappedDeltaY,
          }),
        };
      }
      return node;
    });

    finalNodeIds.forEach((nodeId) => this.updateEdgesForNode(nodeId));
    this.triggerUpdate("nodes-moved", {
      nodeIds: finalNodeIds,
      delta: { x: snappedDeltaX, y: snappedDeltaY },
    });
  }

  updateEdgesForNode(nodeId: string) {
    const edges = this.state.getEdgesByNodeId(nodeId);
    for (const edge of edges) {
      this.renderEdge(edge);
    }
  }

  resizeNode(nodeId: string, box: Box) {
    // TODO: create undo stack if resizing ends
    const node = this.state.getNodeById(nodeId);
    if (!node) throw new Error(`Node with id ${nodeId} not found`);

    const width = this.snapToGrid(box.w);
    const height = this.snapToGrid(box.h);
    const left = this.snapToGrid(box.x);
    const top = this.snapToGrid(box.y);

    this.state.nodes = this.state.nodes.map((n) => {
      if (n.id === nodeId) {
        const updated = {
          ...n,
          position: {
            x: left,
            y: top,
          },
          width: width,
          height: height,
        };

        return updated;
      }
      return n;
    });

    this.updateEdgesForNode(nodeId);

    this.triggerUpdate("node-resized");
  }

  // Delete a node and its connected edges
  deleteNode(nodeId: string) {
    // Save the node and its connected edges for possible undo
    const nodeToDelete = this.state.getNodeById(nodeId);
    const connectedEdges = this.state.getEdgesByNodeId(nodeId);
    const wasSelected = this.state.selection.nodeIds.includes(nodeId);

    if (!nodeToDelete) return;

    this.undoStack.push(
      () => {
        // Delete any connected edges first
        const connectedEdges = this.state.getEdgesByNodeId(nodeId);
        connectedEdges.forEach((edge) => {
          this.deleteEdge(edge.id);
        });

        // Now remove the node
        this.state.nodes = this.state.nodes.filter(
          (node) => node.id !== nodeId
        );

        // Update selection if needed
        this.state.selection.nodeIds = this.state.selection.nodeIds.filter(
          (id) => id !== nodeId
        );

        this.triggerUpdate("node-deleted", { nodeId });
      },
      () => {
        // Restore node
        this.state.nodes = [...this.state.nodes, nodeToDelete];

        // Restore connected edges
        this.state.edges = [...this.state.edges, ...connectedEdges];

        // Restore selection if it was selected
        if (wasSelected && !this.state.selection.nodeIds.includes(nodeId)) {
          this.state.selection.nodeIds = [
            ...this.state.selection.nodeIds,
            nodeId,
          ];
        }

        this.triggerUpdate("node-created", { node: nodeToDelete });
        connectedEdges.forEach((edge) => {
          this.triggerUpdate("edge-created", { edge });
        });
      },
      nodeId,
      nodeToDelete,
      connectedEdges,
      wasSelected
    );
  }

  deleteEdge(edgeId: string) {
    const edgeToDelete = this.state.getEdgeById(edgeId);
    const wasSelected = this.state.selection.edgeIds.includes(edgeId);

    if (!edgeToDelete) return;

    this.undoStack.push(
      () => {
        this.state.edges = this.state.edges.filter(
          (edge) => edge.id !== edgeId
        );
        this.state.selection.edgeIds = this.state.selection.edgeIds.filter(
          (id) => id !== edgeId
        );
        this.triggerUpdate("edge-deleted", { edgeId });
      },
      () => {
        // Restore edge
        this.state.edges = [...this.state.edges, edgeToDelete];

        // Restore selection if it was selected
        if (wasSelected && !this.state.selection.edgeIds.includes(edgeId)) {
          this.state.selection.edgeIds = [
            ...this.state.selection.edgeIds,
            edgeId,
          ];
        }

        this.triggerUpdate("edge-created", { edge: edgeToDelete });
      },
      edgeId,
      edgeToDelete,
      wasSelected
    );
  }

  zoom(scale: number, center?: Point) {
    if (!center) {
      center = {
        x: this.state.viewport.box.w / 2,
        y: this.state.viewport.box.h / 2,
      };
    }

    // Convert center point to canvas coordinates before zoom
    const centerInCanvas = this.state.screenToCanvas(center);

    // Store original viewport state
    const originalViewport = {
      box: { ...this.state.viewport.box },
      zoom: this.state.viewport.zoom,
    };

    // Apply zoom
    const newZoom = Math.min(
      Math.max(0.1, this.state.viewport.zoom * scale),
      5
    ); // Limit zoom to reasonable bounds
    const zoomFactor = newZoom / this.state.viewport.zoom;

    this.undoStack.push(
      () => {
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
        this.triggerUpdate("viewport-changed", {
          viewport: this.state.viewport,
        });
      },
      () => {
        // Restore original viewport state
        this.state.viewport.box = { ...originalViewport.box };
        this.state.viewport.zoom = originalViewport.zoom;
        this.triggerUpdate("viewport-changed", {
          viewport: this.state.viewport,
        });
      },
      scale,
      center,
      originalViewport,
      newZoom
    );
  }

  // Pan the canvas view
  pan(deltaX: number, deltaY: number) {
    const originalBox = { ...this.state.viewport.box };

    this.undoStack.push(
      () => {
        this.state.viewport.box = {
          ...this.state.viewport.box,
          x: this.state.viewport.box.x - deltaX / this.state.viewport.zoom,
          y: this.state.viewport.box.y - deltaY / this.state.viewport.zoom,
        };

        this.triggerUpdate("viewport-changed", {
          viewport: this.state.viewport,
        });
      },
      () => {
        this.state.viewport.box = { ...originalBox };
        this.triggerUpdate("viewport-changed", {
          viewport: this.state.viewport,
        });
      },
      deltaX,
      deltaY,
      originalBox
    );
  }

  undo() {
    this.undoStack.undo();
    this.triggerUpdate("undo-performed");
  }

  redo() {
    this.undoStack.redo();
    this.triggerUpdate("redo-performed");
  }

  canUndo() {
    return this.undoStack.undoAvailable;
  }

  canRedo() {
    return this.undoStack.redoAvailable;
  }

  clearHistory() {
    this.undoStack.clear();
    this.triggerUpdate("history-cleared");
  }

  select(
    nodeIds: string[] = [],
    edgeIds: string[] = [],
    exclusive: boolean = true
  ) {
    // Store original selection
    const originalSelection = {
      nodeIds: [...this.state.selection.nodeIds],
      edgeIds: [...this.state.selection.edgeIds],
      box: this.state.selection.box,
    };

    this.undoStack.push(
      () => {
        if (exclusive) {
          this.state.clearSelection();
        }

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
      },
      () => {
        // Restore original selection
        this.state.selection.nodeIds = [...originalSelection.nodeIds];
        this.state.selection.edgeIds = [...originalSelection.edgeIds];
        this.state.selection.box = originalSelection.box;

        this.triggerUpdate("selection-changed", {
          selection: this.state.selection,
        });
      },
      nodeIds,
      edgeIds,
      exclusive,
      originalSelection
    );
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

    // Store original selection and box
    const originalSelection = {
      nodeIds: [...this.state.selection.nodeIds],
      edgeIds: [...this.state.selection.edgeIds],
      box: this.state.selection.box,
    };

    this.undoStack.push(
      () => {
        // Update selection
        this.select(
          selectedNodes.map((node) => node.id),
          selectedEdges.map((edge) => edge.id),
          true // Replace current selection
        );

        // Update selection box
        this.state.selection.box = snappedRect;
        this.triggerUpdate("selection-rect-changed", { rect: snappedRect });
      },
      () => {
        // Restore original selection
        this.state.selection.nodeIds = [...originalSelection.nodeIds];
        this.state.selection.edgeIds = [...originalSelection.edgeIds];
        this.state.selection.box = originalSelection.box;

        this.triggerUpdate("selection-changed", {
          selection: this.state.selection,
        });

        if (originalSelection.box) {
          this.triggerUpdate("selection-rect-changed", {
            rect: originalSelection.box,
          });
        }
      },
      rect,
      selectedNodes,
      selectedEdges,
      originalSelection
    );
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

  updateHandle(handle: HandleBox) {
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

  getEdgePoints(edge: Edge): Point[] {
    let p1 = edge.from;
    let p2 = edge.to;
    let rect1: Box | undefined;
    let rect2: Box | undefined;

    if (edge.fromHandleId) {
      const node = this.state.getNodeById(edge.fromNodeId!);
      if (node && node.type !== "group" && node.handles) {
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
      if (node && node.type !== "group" && node.handles) {
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
      return createElbowConnector(p1, p2, rect1, rect2);
    }
    return [];
  }

  renderEdge(edge: Edge) {
    this.state.edges = this.state.edges.map((e) => {
      if (e.id === edge.id) {
        return {
          ...e,
          points: this.getEdgePoints(edge),
        };
      }
      return e;
    });

    this.triggerUpdate("edge-updated", { edge });
  }

  createGroup(nodeIds?: string[], edgeIds?: string[]): Node | null {
    console.log("createGroup", nodeIds, edgeIds);
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
    const padding = this.snapToGrid(30); // Snap padding
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
      width: this.snapToGrid(groupWidth),
      height: this.snapToGrid(groupHeight),
      data: {
        label: "Group",
        childNodeIds: selectedNodeIds,
        childEdgeIds: selectedEdgeIds,
      },
      handles: {},
    };

    // Store original node data for undo
    const originalNodesData = selectedNodes.map((node) => ({
      id: node.id,
      data: { ...node.data },
    }));

    // Store original selection
    const originalSelection = {
      nodeIds: [...this.state.selection.nodeIds],
      edgeIds: [...this.state.selection.edgeIds],
    };

    this.undoStack.push(
      () => {
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
        console.log("groupNode", groupNode);
        this.state.nodes.push(groupNode);

        // Select only the group node
        this.select([groupNode.id], [], true);

        this.triggerUpdate("group-created", { group: groupNode });
      },
      () => {
        // Remove the group node
        this.state.nodes = this.state.nodes.filter(
          (node) => node.id !== groupNode.id
        );

        // Restore original node data (removing parent references)
        selectedNodes.forEach((node) => {
          const originalData = originalNodesData.find((n) => n.id === node.id);
          if (originalData) {
            node.data = { ...originalData.data };
          }
        });

        // Restore original selection
        this.state.selection.nodeIds = [...originalSelection.nodeIds];
        this.state.selection.edgeIds = [...originalSelection.edgeIds];

        this.triggerUpdate("group-deleted", {
          groupId: groupNode.id,
          childNodeIds: selectedNodeIds,
        });
      },
      groupNode,
      selectedNodes,
      selectedNodeIds,
      selectedEdgeIds,
      originalNodesData,
      originalSelection
    );

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

    // Store the group data and child node data for possible undo
    const groupData = { ...groupNode };
    const childNodesData = childNodes.map((node) => ({
      id: node.id,
      data: { ...node.data },
    }));

    this.undoStack.push(
      () => {
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
      },
      () => {
        // Restore group node
        this.state.nodes.push(groupData);

        // Restore parent references in child nodes
        childNodes.forEach((node) => {
          const originalData = childNodesData.find((n) => n.id === node.id);
          if (originalData) {
            node.data = { ...originalData.data };
          }
        });

        // Select only the group node
        this.select([groupId], [], true);

        this.triggerUpdate("group-created", { group: groupData });
      },
      groupNode,
      childNodes,
      childNodeIds
    );

    return childNodes;
  }

  updateState(state: Partial<CanvasStateOptions>) {
    const originalState = {
      nodes: [...this.state.nodes],
      edges: [...this.state.edges],
      viewport: { ...this.state.viewport },
    };

    this.undoStack.push(
      () => {
        if (state.nodes) {
          this.state.nodes = state.nodes;
        }
        if (state.edges) {
          this.state.edges = state.edges;
        }
        if (state.viewport) {
          this.state.viewport = state.viewport;
        }

        this.triggerUpdate("state-updated", { state });
      },
      () => {
        if (state.nodes) {
          this.state.nodes = originalState.nodes;
        }
        if (state.edges) {
          this.state.edges = originalState.edges;
        }
        if (state.viewport) {
          this.state.viewport = originalState.viewport;
        }

        this.triggerUpdate("state-updated", { state: originalState });
      },
      state,
      originalState
    );
  }
}
