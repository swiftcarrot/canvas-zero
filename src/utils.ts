import type { Point } from "./types";

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
