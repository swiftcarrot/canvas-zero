import { expect, test } from "bun:test";
import { createElbowConnector } from "./";

test("createElbowConnector", () => {
  expect(createElbowConnector({ x: 20, y: 20 }, { x: 40, y: 30 })).toEqual([
    { x: 20, y: 20 },
    { x: 30, y: 20 },
    { x: 30, y: 30 },
    { x: 40, y: 30 },
  ]);

  expect(
    createElbowConnector(
      { x: 100, y: 100 },
      { x: 300, y: 300 },
      { x: 40, y: 40, w: 120, h: 60 },
      { x: 240, y: 300, w: 120, h: 60 }
    )
  ).toEqual([
    { x: 100, y: 100 },
    { x: 100, y: 200 },
    { x: 300, y: 200 },
    { x: 300, y: 300 },
  ]);
});
