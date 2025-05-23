import { test, expect } from "bun:test";
import { simplifyPath } from "./";

test("simplifyPath", () => {
  expect(simplifyPath([])).toEqual([]);
  expect(
    simplifyPath([
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 30, y: 10 },
    ])
  ).toEqual([
    { x: 10, y: 10 },
    { x: 30, y: 10 },
  ]);
});
