import { test, expect } from "bun:test";
import { CanvasState } from "./state";
import type { Node, Edge, Point, Rectangle } from "./types";

test("CanvasState constructor with default options", () => {
  const state = new CanvasState();
  expect(state.nodes).toEqual([]);
  expect(state.edges).toEqual([]);
  expect(state.viewport).toEqual({
    rect: { x: 0, y: 0, width: 1000, height: 1000 },
    zoom: 1,
  });
  expect(state.selection).toEqual({
    nodeIds: [],
    edgeIds: [],
    box: null,
  });
  expect(state.draggingNode).toBeNull();
  expect(state.draggingEdge).toBeNull();
  expect(state.isDragging).toBe(false);
  expect(state.isPanning).toBe(false);
  expect(state.lastMousePosition).toBeNull();
});

test("CanvasState constructor with custom options", () => {
  const nodes: Node[] = [
    {
      id: "node1",
      type: "default",
      position: { x: 100, y: 100 },
      data: { label: "Node 1" },
    },
  ];

  const edges: Edge[] = [
    {
      id: "edge1",
      type: "default",
      fromNodeId: "node1",
      toNodeId: "node2",
    },
  ];

  const viewport = {
    rect: { x: 50, y: 50, width: 800, height: 600 },
    zoom: 1.5,
  };

  const state = new CanvasState({ nodes, edges, viewport });
  expect(state.nodes).toEqual(nodes);
  expect(state.edges).toEqual(edges);
  expect(state.viewport).toEqual(viewport);
});

test("getNodeById", () => {
  const node: Node = {
    id: "node1",
    type: "default",
    position: { x: 100, y: 100 },
    data: { label: "Node 1" },
  };

  const state = new CanvasState({ nodes: [node] });
  expect(state.getNodeById("node1")).toEqual(node);
  expect(state.getNodeById("nonexistent")).toBeUndefined();
});

test("getEdgeById", () => {
  const edge: Edge = {
    id: "edge1",
    type: "default",
    fromNodeId: "node1",
    toNodeId: "node2",
  };

  const state = new CanvasState({ edges: [edge] });
  expect(state.getEdgeById("edge1")).toEqual(edge);
  expect(state.getEdgeById("nonexistent")).toBeUndefined();
});

test("getEdgesByNodeId", () => {
  const edges: Edge[] = [
    {
      id: "edge1",
      type: "default",
      fromNodeId: "node1",
      toNodeId: "node2",
    },
    {
      id: "edge2",
      type: "default",
      fromNodeId: "node3",
      toNodeId: "node1",
    },
    {
      id: "edge3",
      type: "default",
      fromNodeId: "node2",
      toNodeId: "node3",
    },
  ];

  const state = new CanvasState({ edges });
  expect(state.getEdgesByNodeId("node1")).toEqual([edges[0], edges[1]]);
  expect(state.getEdgesByNodeId("node2")).toEqual([edges[0], edges[2]]);
  expect(state.getEdgesByNodeId("nonexistent")).toEqual([]);
});

test("screenToCanvas", () => {
  const viewport = {
    rect: { x: 100, y: 50, width: 800, height: 600 },
    zoom: 2,
  };

  const state = new CanvasState({ viewport });
  const screenPoint: Point = { x: 200, y: 100 };
  const canvasPoint = state.screenToCanvas(screenPoint);

  expect(canvasPoint).toEqual({ x: 200 / 2 + 100, y: 100 / 2 + 50 });
  expect(canvasPoint).toEqual({ x: 200, y: 100 });
});

test("canvasToScreen", () => {
  const viewport = {
    rect: { x: 100, y: 50, width: 800, height: 600 },
    zoom: 2,
  };

  const state = new CanvasState({ viewport });
  const canvasPoint: Point = { x: 200, y: 100 };
  const screenPoint = state.canvasToScreen(canvasPoint);

  expect(screenPoint).toEqual({ x: (200 - 100) * 2, y: (100 - 50) * 2 });
  expect(screenPoint).toEqual({ x: 200, y: 100 });
});

test("clearSelection", () => {
  const selection = {
    nodeIds: ["node1", "node2"],
    edgeIds: ["edge1"],
    box: { x: 0, y: 0, width: 100, height: 100 } as Rectangle,
  };

  const state = new CanvasState();
  state.selection = selection;

  state.clearSelection();
  expect(state.selection).toEqual({
    nodeIds: [],
    edgeIds: [],
    box: null,
  });
});

test("getSerializableState", () => {
  const nodes: Node[] = [
    {
      id: "node1",
      type: "default",
      position: { x: 100, y: 100 },
      data: { label: "Node 1" },
    },
  ];

  const edges: Edge[] = [
    {
      id: "edge1",
      type: "default",
      fromNodeId: "node1",
      toNodeId: "node2",
    },
  ];

  const state = new CanvasState({ nodes, edges });
  const serializableState = state.getSerializableState();

  expect(serializableState).toEqual({ nodes, edges });
  expect(serializableState.viewport).toBeUndefined();
  expect(serializableState.selection).toBeUndefined();
});
