import type { Point, Rectangle } from "./types";

export function rectangleByPoints(p1: Point, p2: Point): Rectangle {
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const width = Math.abs(p1.x - p2.x);
  const height = Math.abs(p1.y - p2.y);
  return { x, y, width, height };
}

export function rectanglesOverlap(r1: Rectangle, r2: Rectangle) {
  return !(
    r1.x + r1.width <= r2.x ||
    r1.y + r1.height <= r2.y ||
    r1.x >= r2.x + r2.width ||
    r1.y >= r2.y + r2.height
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
