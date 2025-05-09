import type { Point, Box } from "./types";

export function rectangleByPoints(p1: Point, p2: Point): Box {
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const width = Math.abs(p1.x - p2.x);
  const height = Math.abs(p1.y - p2.y);
  return { x, y, w: width, h: height };
}

export function rectanglesOverlap(r1: Box, r2: Box) {
  return !(
    r1.x + r1.w <= r2.x ||
    r1.y + r1.h <= r2.y ||
    r1.x >= r2.x + r2.w ||
    r1.y >= r2.y + r2.h
  );
}

export function simplifyPath(path: Point[]) {
  const simplified: Point[] = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i]!;
    if (i === 0 || i === path.length - 1) {
      simplified.push(p);
    } else {
      const prev = path[i - 1]!;
      const next = path[i + 1]!;
      if (
        (prev.x === p.x && p.x === next.x) ||
        (prev.y === p.y && p.y === next.y)
      ) {
        continue;
      }
      simplified.push(p);
    }
  }
  return simplified;
}

// TODO: use more standardized way to generate unique IDs
export function generateId(prefix: string = ""): string {
  return `${prefix}${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function isPointInAnyRectangle(
  point: Point,
  rectangles: Box[]
): boolean {
  return rectangles.some(
    (rect) =>
      point.x >= rect.x &&
      point.x <= rect.x + rect.w &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.h
  );
}

export function isPointInBounds(point: Point, bounds: Box): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.w &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.h
  );
}

export const GRID_SIZE = 10; // 10px grid by default, TODO: make this configurable via editor options

export const snapToGrid = (value: number): number => {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

export const snapPointToGrid = (point: { x: number; y: number }) => {
  return {
    x: snapToGrid(point.x),
    y: snapToGrid(point.y),
  };
};
