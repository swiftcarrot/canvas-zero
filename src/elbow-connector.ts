export const GRID_SIZE = 10; // 10px grid by default

export const snapToGrid = (value: number): number => {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

export const snapPointToGrid = (point: { x: number; y: number }) => {
  return {
    x: snapToGrid(point.x),
    y: snapToGrid(point.y),
  };
};

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DIRECTIONS = [
  { x: 0, y: -GRID_SIZE }, // Up
  { x: GRID_SIZE, y: 0 }, // Right
  { x: 0, y: GRID_SIZE }, // Down
  { x: -GRID_SIZE, y: 0 }, // Left
];

function isPointInAnyRectangle(point: Point, rectangles: Rectangle[]): boolean {
  return rectangles.some(
    (rect) =>
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
  );
}

function isPointInBounds(point: Point, bounds: Rectangle): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

function pointKey(point: Point): string {
  return `${point.x},${point.y}`;
}

function simplifyPath(path: Point[]) {
  const simplified: Point[] = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (i === 0 || i === path.length - 1) {
      simplified.push(p);
    } else {
      const prev = path[i - 1];
      const next = path[i + 1];
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

function balancePath(path: Point[], rect1: Rectangle, rect2: Rectangle) {
  let x1, x2, y1, y2;
  if (rect1.x + rect1.width < rect2.x) {
    x1 = rect1.x + rect1.width;
    x2 = rect2.x;
  } else if (rect2.x + rect2.width < rect1.x) {
    x1 = rect2.x + rect2.width;
    x2 = rect1.x;
  }

  if (rect1.y + rect1.height < rect2.y) {
    y1 = rect1.y + rect1.height;
    y2 = rect2.y;
  } else if (rect2.y + rect2.height < rect1.y) {
    y1 = rect2.y + rect2.height;
    y2 = rect1.y;
  }

  let balanced = false;
  if (x1 && x2) {
    const points = path
      .map((p, i) => ({ x: p.x, y: p.y, i }))
      .filter((p) => p.x > x1 && p.x < x2);
    if (points.length === 2) {
      const s = path[points[0].i - 1];
      const e = path[points[1].i + 1];
      if (s && e) {
        path[points[0].i] = {
          x: s.x + (e.x - s.x) / 2,
          y: points[0].y,
        };
        path[points[1].i] = {
          x: s.x + (e.x - s.x) / 2,
          y: points[1].y,
        };
        balanced = true;
      }
    }
  }

  if (y1 && y2 && !balanced) {
    const points = path
      .map((p, i) => ({ x: p.x, y: p.y, i }))
      .filter((p) => p.y > y1 && p.y < y2);
    if (points.length === 2) {
      const s = path[points[0].i - 1];
      const e = path[points[1].i + 1];
      if (s && e) {
        path[points[0].i] = {
          x: points[0].x,
          y: s.y + (e.y - s.y) / 2,
        };
        path[points[1].i] = {
          x: points[1].x,
          y: s.y + (e.y - s.y) / 2,
        };
      }
    }
  }

  return path;
}

interface Node {
  point: Point;
  direction: number | null;
  turns: number;
  path: Point[];
}

export function findPath(
  bounds: Rectangle,
  p1: Point,
  p2: Point,
  rectangles: Rectangle[]
): Point[] {
  const start = snapPointToGrid(p1);
  const end = snapPointToGrid(p2);

  const startNode: Node = {
    point: start,
    direction: null,
    turns: 0,
    path: [start],
  };
  const queue: Node[] = [startNode];
  const visited = new Map<string, { turns: number }>();

  while (queue.length > 0) {
    queue.sort((a, b) => {
      if (a.path.length !== b.path.length) {
        return a.path.length - b.path.length;
      }
      return a.turns - b.turns;
    });

    const current = queue.shift()!;

    if (current.point.x === end.x && current.point.y === end.y) {
      return current.path;
    }

    for (let dir = 0; dir < DIRECTIONS.length; dir++) {
      const move = DIRECTIONS[dir];
      const nextPoint: Point = {
        x: current.point.x + move.x,
        y: current.point.y + move.y,
      };

      const key = pointKey(nextPoint);
      const turns =
        current.direction === null || current.direction === dir
          ? current.turns
          : current.turns + 1;

      if (
        !isPointInBounds(nextPoint, bounds) ||
        (isPointInAnyRectangle(nextPoint, rectangles) &&
          !(nextPoint.x === end.x && nextPoint.y === end.y))
      ) {
        continue;
      }

      if (!visited.has(key) || visited.get(key)!.turns > turns) {
        visited.set(key, { turns });
        queue.push({
          point: nextPoint,
          direction: dir,
          turns: turns,
          path: [...current.path, nextPoint],
        });
      }
    }
  }

  return [];
}

export function createSvgPath(points: Point[]) {
  if (!points || points.length === 0) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }

  return path;
}

export const createElbowConnector = (
  p1: Point,
  p2: Point,
  rect1?: Rectangle,
  rect2?: Rectangle
) => {
  const dx = Math.abs(p1.x - p2.x);
  const dy = Math.abs(p1.y - p2.y);

  if (!rect1) {
    const width = GRID_SIZE * 2;
    const height = GRID_SIZE * 2;
    rect1 =
      dx > dy
        ? {
            x: p1.x + (p1.x < p2.x ? -width : 0),
            y: p1.y - height / 2,
            width: width,
            height: height,
          }
        : {
            x: p1.x - width / 2,
            y: p1.y + (p1.y < p2.y ? -height : 0),
            width: width,
            height: height,
          };
  }
  if (!rect2) {
    const width = GRID_SIZE * 2;
    const height = GRID_SIZE * 2;
    rect2 =
      dx > dy
        ? {
            x: p2.x + (p1.x < p2.x ? 0 : -width),
            y: p2.y - height / 2,
            width: width,
            height: height,
          }
        : {
            x: p2.x - width / 2,
            y: p2.y + (p1.y < p2.y ? 0 : -height),
            width: width,
            height: height,
          };
  }

  const minX = Math.min(rect1.x, rect2.x);
  const minY = Math.min(rect1.y, rect2.y);
  const maxX = Math.max(rect1.x + rect1.width, rect2.x + rect2.width);
  const maxY = Math.max(rect1.y + rect1.height, rect2.y + rect2.height);

  const bounds = {
    x: minX - GRID_SIZE,
    y: minY - GRID_SIZE,
    width: maxX - minX + GRID_SIZE * 2,
    height: maxY - minY + GRID_SIZE * 2,
  };

  let path = findPath(bounds, p1, p2, [rect1, rect2]);
  path = simplifyPath(path);
  path = balancePath(path, rect1, rect2);

  return path;
};
