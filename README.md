# canvas0

A lightweight infinite canvas library for building interactive node-based applications.

## Features

- 🖱️ Interactive infinite canvas with pan & zoom capabilities
- 🔀 Elbow connectors for edges between nodes
- 🧩 Support for customizable nodes and edges
- 🖌️ SVG rendering for crisp graphics at any scale
- 📱 Touch & mouse event support
- ⚡ High-performance rendering

## Installation

```bash
npm install canvas-zero
# or
yarn add canvas-zero
```

## Basic Usage

```tsx
import { Canvas } from "canvas-zero";

function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas />
    </div>
  );
}
```

## Advanced Usage

### Creating a Custom Canvas

```tsx
import { useCanvas, Canvas, Editor } from "canvas-zero";
import { useEffect } from "react";

function CustomCanvas() {
  const { editor, updateCanvas } = useCanvas();

  useEffect(() => {
    // Create nodes
    const node1 = editor.createNode(
      "custom",
      { x: 100, y: 100 },
      { label: "Node 1" }
    );
    const node2 = editor.createNode(
      "custom",
      { x: 300, y: 200 },
      { label: "Node 2" }
    );

    // Create an edge between them
    editor.createEdge(node1.id, node2.id);

    // Update the canvas to reflect changes
    updateCanvas();
  }, [editor, updateCanvas]);

  return (
    <div style={{ width: "800px", height: "600px" }}>
      <Canvas />
    </div>
  );
}
```

### Canvas Interactions

- **Pan**: Hold spacebar, Alt key or middle mouse button and drag
- **Zoom**: Use mouse wheel or pinch gesture on touchscreens
- **Select**: Click on nodes or edges, or drag to create a selection box
- **Move**: Drag selected nodes
- **Multi-select**: Hold Shift while selecting

## API Reference

### Components

- `Canvas`: The main canvas component

### Hooks

- `useCanvas()`: Returns `{ editor, updateCanvas }`

### Editor Methods

```tsx
// Create a new node
editor.createNode(type, position, data, width, height);

// Create a connection between nodes
editor.createEdge(fromNodeId, toNodeId, fromHandleId, toHandleId, type);

// Move a node
editor.moveNode(nodeId, newPosition);

// Delete a node (and its connected edges)
editor.deleteNode(nodeId);

// Delete an edge
editor.deleteEdge(edgeId);

// Select nodes and/or edges
editor.select(nodeIds, edgeIds, exclusive);

// Zoom the canvas
editor.zoom(scale, centerPoint);

// Pan the canvas
editor.pan(deltaX, deltaY);
```

## License

canvas0 is licensed under Apache 2.0 as found in the LICENSE file.
