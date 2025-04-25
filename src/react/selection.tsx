interface SelectionBoxProps {
  box: { x: number; y: number; width: number; height: number } | null;
}

export function SelectionBox({ box }: SelectionBoxProps) {
  if (!box) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        border: "1px dashed #3182ce",
        backgroundColor: "rgba(66, 153, 225, 0.1)",
        pointerEvents: "none",
      }}
    />
  );
}
