export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  p1: Point;
  p2: Point;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  type: "line" | "bezier" | "elbow-connector" | string;
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
