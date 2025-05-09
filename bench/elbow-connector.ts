import { run, bench } from "mitata";
import { createElbowConnector } from "../src";

bench("createElbowConnector", () =>
  createElbowConnector(
    { x: 100, y: 100 },
    { x: 300, y: 300 },
    { x: 40, y: 40, w: 120, h: 60 },
    { x: 240, y: 300, w: 120, h: 60 }
  )
);

await run();
