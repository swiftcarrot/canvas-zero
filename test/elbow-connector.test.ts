import { expect, test } from "bun:test";
import { createElbowConnector } from "../src";

test("createElbowConnector", () => {
  expect(createElbowConnector({ x: 20, y: 20 }, { x: 40, y: 30 }))
    .toMatchInlineSnapshot(`
    [
      {
        "x": 20,
        "y": 20,
      },
      {
        "x": 30,
        "y": 20,
      },
      {
        "x": 30,
        "y": 30,
      },
      {
        "x": 40,
        "y": 30,
      },
    ]
  `);
});
