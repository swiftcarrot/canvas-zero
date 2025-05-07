import { test, expect } from "bun:test";
import { Editor } from "./editor";
import { CanvasState } from "./state";
import type { Point, Rectangle } from "./types";

test("Editor initialization", () => {
  const editor = new Editor();
  expect(editor.state).toBeInstanceOf(CanvasState);
  expect(editor.container).toBeNull();
});

// test("Editor setContainer", () => {
//   const editor = new Editor();
//   const container = document.createElement("div");
//   editor.setContainer(container);
//   expect(editor.container).toBe(container);
// });

test("Create node", () => {
  const editor = new Editor();
  const position = { x: 100, y: 100 };
  const data = { label: "Test Node" };

  const node = editor.createNode("default", position, data, 200, 150);

  expect(node).toBeDefined();
  expect(node.id).toContain("node-");
  expect(node.type).toBe("default");
  expect(node.position).toEqual(position);
  expect(node.width).toBe(200);
  expect(node.height).toBe(150);
  expect(node.data).toEqual(data);
  expect(editor.state.nodes).toContain(node);
});

test("Create edge", () => {
  const editor = new Editor();

  const fromNode = editor.createNode("default", { x: 100, y: 100 });
  const toNode = editor.createNode("default", { x: 300, y: 300 });

  const edge = editor.createEdge(fromNode.id, toNode.id);

  expect(edge).toBeDefined();
  expect(edge?.id).toContain("edge-");
  expect(edge?.fromNodeId).toBe(fromNode.id);
  expect(edge?.toNodeId).toBe(toNode.id);
  expect(edge?.fromHandleId).toBe("default");
  expect(edge?.toHandleId).toBe("default");
  expect(edge?.type).toBe("default");
  expect(editor.state.edges).toContain(edge);
});

test("Create edge with invalid node ids", () => {
  const editor = new Editor();

  const edge = editor.createEdge("non-existent-1", "non-existent-2");

  expect(edge).toBeNull();
  expect(editor.state.edges.length).toBe(0);
});

test("Move node", () => {
  const editor = new Editor();
  const initialPosition = { x: 100, y: 100 };
  const newPosition = { x: 200, y: 200 };

  const node = editor.createNode("default", initialPosition);
  editor.moveNode(node.id, newPosition);

  const updatedNode = editor.state.getNodeById(node.id);
  expect(updatedNode?.position).toEqual(newPosition);
});

test("Move multiple nodes", () => {
  const editor = new Editor();

  const node1 = editor.createNode("default", { x: 100, y: 100 });
  const node2 = editor.createNode("default", { x: 200, y: 200 });

  editor.moveNodes([node1.id, node2.id], 50, 50);

  const updatedNode1 = editor.state.getNodeById(node1.id);
  const updatedNode2 = editor.state.getNodeById(node2.id);

  expect(updatedNode1?.position).toEqual({ x: 150, y: 150 });
  expect(updatedNode2?.position).toEqual({ x: 250, y: 250 });
});

test("Resize node", () => {
  const editor = new Editor();

  const node = editor.createNode("default", { x: 100, y: 100 }, {}, 100, 100);
  editor.resizeNode(node.id, 200, 150);

  const updatedNode = editor.state.getNodeById(node.id);
  expect(updatedNode?.width).toBe(200);
  expect(updatedNode?.height).toBe(150);
});

test("Delete node", () => {
  const editor = new Editor();

  const node = editor.createNode("default", { x: 100, y: 100 });
  const nodeId = node.id;

  editor.deleteNode(nodeId);

  expect(editor.state.getNodeById(nodeId)).toBeUndefined();
  expect(editor.state.nodes.length).toBe(0);
});

test("Delete node with connected edges", () => {
  const editor = new Editor();

  const fromNode = editor.createNode("default", { x: 100, y: 100 });
  const toNode = editor.createNode("default", { x: 300, y: 300 });

  const edge = editor.createEdge(fromNode.id, toNode.id);

  editor.deleteNode(fromNode.id);

  expect(editor.state.getNodeById(fromNode.id)).toBeUndefined();
  expect(editor.state.edges.length).toBe(0);
  expect(editor.state.getEdgeById(edge?.id || "")).toBeUndefined();
});

test("Delete edge", () => {
  const editor = new Editor();

  const fromNode = editor.createNode("default", { x: 100, y: 100 });
  const toNode = editor.createNode("default", { x: 300, y: 300 });

  const edge = editor.createEdge(fromNode.id, toNode.id);
  const edgeId = edge?.id || "";

  editor.deleteEdge(edgeId);

  expect(editor.state.getEdgeById(edgeId)).toBeUndefined();
  expect(editor.state.edges.length).toBe(0);
});

test("Zoom with specified center", () => {
  const editor = new Editor();
  editor.state.viewport.zoom = 1;

  const center = { x: 500, y: 500 };
  editor.zoom(2, center);

  expect(editor.state.viewport.zoom).toBe(2);
});

test("Zoom limits", () => {
  const editor = new Editor();

  editor.zoom(0.05); // Should be limited to 0.1
  expect(editor.state.viewport.zoom).toBe(0.1);

  editor.zoom(60); // Should be limited to 5
  expect(editor.state.viewport.zoom).toBe(5);
});

test("Pan", () => {
  const editor = new Editor();
  const initialX = editor.state.viewport.rect.x;
  const initialY = editor.state.viewport.rect.y;

  editor.pan(100, 50);

  expect(editor.state.viewport.rect.x).toBe(initialX - 100);
  expect(editor.state.viewport.rect.y).toBe(initialY - 50);
});

test("Select nodes and edges", () => {
  const editor = new Editor();

  const node1 = editor.createNode("default", { x: 100, y: 100 });
  const node2 = editor.createNode("default", { x: 200, y: 200 });
  const fromNode = editor.createNode("default", { x: 300, y: 300 });
  const toNode = editor.createNode("default", { x: 400, y: 400 });

  const edge = editor.createEdge(fromNode.id, toNode.id);
  const edgeId = edge?.id || "";

  editor.select([node1.id, node2.id], [edgeId]);

  expect(editor.state.selection.nodeIds).toContain(node1.id);
  expect(editor.state.selection.nodeIds).toContain(node2.id);
  expect(editor.state.selection.edgeIds).toContain(edgeId);
});

test("Select all", () => {
  const editor = new Editor();

  const node1 = editor.createNode("default", { x: 100, y: 100 });
  const node2 = editor.createNode("default", { x: 200, y: 200 });
  const fromNode = editor.createNode("default", { x: 300, y: 300 });
  const toNode = editor.createNode("default", { x: 400, y: 400 });

  const edge = editor.createEdge(fromNode.id, toNode.id);
  const edgeId = edge?.id || "";

  editor.selectAll();

  expect(editor.state.selection.nodeIds.length).toBe(4);
  expect(editor.state.selection.edgeIds.length).toBe(1);
});

test("Select by rect", () => {
  const editor = new Editor();

  editor.createNode("default", { x: 100, y: 100 }, {}, 50, 50);
  editor.createNode("default", { x: 200, y: 200 }, {}, 50, 50);
  const node3 = editor.createNode("default", { x: 300, y: 300 }, {}, 50, 50);
  const node4 = editor.createNode("default", { x: 400, y: 400 }, {}, 50, 50);

  const selectionRect: Rectangle = {
    x: 250,
    y: 250,
    width: 200,
    height: 200,
  };

  editor.selectByRect(selectionRect);

  expect(editor.state.selection.nodeIds.length).toBe(2);
  expect(editor.state.selection.nodeIds).toContain(node3.id);
  expect(editor.state.selection.nodeIds).toContain(node4.id);
});

test("Start, continue, and stop node drag", () => {
  const editor = new Editor();

  const node = editor.createNode("default", { x: 100, y: 100 });
  const startPoint: Point = { x: 100, y: 100 };

  editor.startNodeDrag(node.id, startPoint);

  expect(editor.state.isDragging).toBe(true);
  expect(editor.state.draggingNode).toBe(node.id);
  expect(editor.state.lastMousePosition).toEqual(startPoint);

  const dragPoint: Point = { x: 150, y: 150 };
  editor.dragNodes(dragPoint);

  const updatedNode = editor.state.getNodeById(node.id);
  expect(updatedNode?.position).toEqual({ x: 150, y: 150 });

  editor.stopDrag();

  expect(editor.state.isDragging).toBe(false);
  expect(editor.state.draggingNode).toBeNull();
  expect(editor.state.lastMousePosition).toBeNull();
});

test("Start, continue, and stop pan", () => {
  const editor = new Editor();

  const startPoint: Point = { x: 100, y: 100 };
  editor.startPan(startPoint);

  expect(editor.state.isPanning).toBe(true);
  expect(editor.state.lastMousePosition).toEqual(startPoint);

  const initialX = editor.state.viewport.rect.x;
  const initialY = editor.state.viewport.rect.y;

  const panPoint: Point = { x: 150, y: 150 };
  editor.continuePan(panPoint);

  expect(editor.state.viewport.rect.x).toBe(initialX - 50);
  expect(editor.state.viewport.rect.y).toBe(initialY - 50);

  editor.stopPan();

  expect(editor.state.isPanning).toBe(false);
  expect(editor.state.lastMousePosition).toBeNull();
});

test("Create group", () => {
  const editor = new Editor();

  const node1 = editor.createNode("default", { x: 100, y: 100 }, {}, 50, 50);
  const node2 = editor.createNode("default", { x: 200, y: 200 }, {}, 50, 50);

  editor.select([node1.id, node2.id], [], true);

  const group = editor.createGroup();

  expect(group).toBeDefined();
  expect(group?.type).toBe("group");
  expect(group?.data.childNodeIds).toContain(node1.id);
  expect(group?.data.childNodeIds).toContain(node2.id);

  const updatedNode1 = editor.state.getNodeById(node1.id);
  expect(updatedNode1?.data.parentId).toBe(group?.id);
});

test("Ungroup", () => {
  const editor = new Editor();

  const node1 = editor.createNode("default", { x: 100, y: 100 }, {}, 50, 50);
  const node2 = editor.createNode("default", { x: 200, y: 200 }, {}, 50, 50);

  editor.select([node1.id, node2.id], [], true);

  const group = editor.createGroup();

  editor.select([group?.id || ""], [], true);

  const ungroupedNodes = editor.ungroup();

  expect(ungroupedNodes).toBeDefined();
  expect(ungroupedNodes?.length).toBe(2);

  const updatedNode1 = editor.state.getNodeById(node1.id);
  expect(updatedNode1?.data.parentId).toBeUndefined();

  expect(editor.state.getNodeById(group?.id || "")).toBeUndefined();
});

test("Update state", () => {
  const editor = new Editor();
  const newNodes = [
    {
      id: "test-node-1",
      type: "default",
      position: { x: 100, y: 100 },
      data: {},
    },
  ];

  editor.updateState({ nodes: newNodes });

  expect(editor.state.nodes).toEqual(newNodes);
});

// test("Get edge path", () => {
//   const editor = new Editor();
//   const containerMock = document.createElement("div");
//   editor.setContainer(containerMock);

//   const fromNode = editor.createNode("default", { x: 100, y: 100 }, {}, 50, 50);
//   const toNode = editor.createNode("default", { x: 300, y: 300 }, {}, 50, 50);

//   const edge = editor.createEdge(fromNode.id, toNode.id);

//   const path = editor.getEdgePath(edge!);

//   expect(path).toBeDefined();
//   expect(Array.isArray(path)).toBe(true);
// });
