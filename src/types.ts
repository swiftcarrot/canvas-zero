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

export interface Viewport {
  rect: Rectangle;
  zoom: number;
}

export interface Node {
  id: string;
  type: string;
  position: Point;
  width?: number;
  height?: number;
  data: {
    label?: string;
    content?: string;
    parentId?: string;
    originalPosition?: Point;
    childNodeIds?: string[];
    [key: string]: any;
  };
}

export interface Edge {
  id: string;
  type: string;
  from?: Point;
  to?: Point;
  fromNodeId?: string;
  toNodeId?: string;
  fromHandleId?: string;
  toHandleId?: string;
  data?: Record<string, any>;
}

export interface Handle {
  id: string;
  position: "top" | "right" | "bottom" | "left" | Point;
}

export interface Selection {
  nodeIds: string[];
  edgeIds: string[];
  box: Rectangle | null;
}
