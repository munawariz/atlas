"use client";

import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

export type DragHandleProps = {
  onPointerDown: (e: PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: PointerEvent<HTMLElement>) => void;
  style: CSSProperties;
};

type DragState = {
  id: number;
  startIndex: number;
  pointerStartY: number;
  centers: number[]; // visual center Y of each row, measured at drag start
  height: number; // dragged row height — used for the gap the others open up
};

// Touch + mouse drag-to-reorder for a vertical list, dependency-free (Pointer Events).
// Drag is started only from the handle in `renderItem` (so the row's own controls still
// work). The list reorders locally for instant feedback, then calls `onReorder` to persist;
// it re-syncs whenever the server sends a new `ids` order.
export default function SortableList({
  ids,
  onReorder,
  renderItem,
  className,
}: {
  ids: number[];
  onReorder: (orderedIds: number[]) => void;
  renderItem: (
    id: number,
    args: { handleProps: DragHandleProps; dragging: boolean; index: number }
  ) => ReactNode;
  className?: string;
}) {
  const [order, setOrder] = useState(ids);
  // Re-sync local order when the server hands back a new order (compared by value).
  const idsKey = ids.join(",");
  const prevKey = useRef(idsKey);
  if (prevKey.current !== idsKey) {
    prevKey.current = idsKey;
    setOrder(ids);
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dy, setDy] = useState(0);
  const [target, setTarget] = useState(0);

  const start = (id: number) => (e: PointerEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const startIndex = order.indexOf(id);
    if (startIndex < 0) return;
    const rows = Array.from(container.children) as HTMLElement[];
    const centers = rows.map((el) => {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    });
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    setDrag({ id, startIndex, pointerStartY: e.clientY, centers, height: rows[startIndex]?.getBoundingClientRect().height ?? 0 });
    setDy(0);
    setTarget(startIndex);
  };

  const move = (e: PointerEvent<HTMLElement>) => {
    if (!drag) return;
    setDy(e.clientY - drag.pointerStartY);
    const draggedCenter = drag.centers[drag.startIndex] + (e.clientY - drag.pointerStartY);
    // New index = how many OTHER rows sit above the dragged row's current center.
    let count = 0;
    for (let i = 0; i < drag.centers.length; i++) {
      if (i !== drag.startIndex && drag.centers[i] < draggedCenter) count++;
    }
    setTarget(count);
  };

  const end = () => {
    if (!drag) return;
    if (target !== drag.startIndex) {
      const next = [...order];
      const [moved] = next.splice(drag.startIndex, 1);
      next.splice(target, 0, moved);
      setOrder(next);
      onReorder(next);
    }
    setDrag(null);
    setDy(0);
  };

  const handleProps = (id: number): DragHandleProps => ({
    onPointerDown: start(id),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
    style: { touchAction: "none", cursor: "grab" },
  });

  return (
    <div ref={containerRef} className={className}>
      {order.map((id, i) => {
        const dragging = drag?.id === id;
        // Non-dragged rows between the start and target slots shift to open the gap.
        let shift = 0;
        if (drag && !dragging) {
          if (target > drag.startIndex && i > drag.startIndex && i <= target) shift = -drag.height;
          else if (target < drag.startIndex && i >= target && i < drag.startIndex) shift = drag.height;
        }
        const style: CSSProperties = dragging
          ? {
              transform: `translateY(${dy}px)`,
              transition: "none",
              position: "relative",
              zIndex: 30,
              boxShadow: "0 14px 32px -10px rgba(0,0,0,0.6)",
            }
          : {
              transform: shift ? `translateY(${shift}px)` : undefined,
              transition: drag ? "transform 160ms ease" : undefined,
              position: "relative",
            };
        return (
          <div key={id} style={style}>
            {renderItem(id, { handleProps: handleProps(id), dragging, index: i })}
          </div>
        );
      })}
    </div>
  );
}
