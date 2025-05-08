export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  p1: Point;
  p2: Point;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Viewport {
  box: Box;
  zoom: number;
}

export interface HandleBox {
  id: string;
  nodeId: string;
  box: Box;
}

// TODO: node.box
export interface Node {
  id: string;
  type: string;
  position: Point;
  width: number; // TODO: support auto size node
  height: number;
  handles: Record<string, HandleBox>;
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
  points?: Point[];
}

export interface Selection {
  nodeIds: string[];
  edgeIds: string[];
  box: Box | null;
}
