"use client";

import {
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { GripVertical } from "@/components/icons";

export interface DragHandleProps {
  onPointerDown: (e: PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: PointerEvent<HTMLElement>) => void;
  style: CSSProperties;
}

interface DragState {
  id: number;
  startIndex: number;
  pointerStartY: number;
  /** Visual centre Y of every row, measured once at drag start. */
  centers: number[];
}

/**
 * Drag-to-reorder for a vertical list — touch and mouse, no dependency.
 *
 * Pointer Events rather than HTML5 drag-and-drop, which does not fire on touch at all and
 * this app is phone-first. The drag starts only from the handle passed to `renderItem`, so
 * every control already living in the row keeps working.
 *
 * The reorder is OPTIMISTIC: the drop commits to `useOptimistic` state and paints instantly,
 * then `onReorder` persists in the same transition. React drops back to the `ids` prop when
 * the server's re-render lands — so a save that succeeds is invisible (the order it sends
 * back is the order already on screen) and one that fails snaps the row home by itself,
 * with no error-path bookkeeping here. `isPending` drives the "Saving order…" line so a slow
 * round trip reads as in-flight rather than ignored.
 */
export default function SortableList({
  ids,
  onReorder,
  renderItem,
  className,
}: {
  ids: number[];
  onReorder: (orderedIds: number[]) => void | Promise<void>;
  renderItem: (
    id: number,
    args: { handleProps: DragHandleProps; dragging: boolean; index: number }
  ) => ReactNode;
  className?: string;
}) {
  const [order, setOptimisticOrder] = useOptimistic(ids);
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dy, setDy] = useState(0);
  const [target, setTarget] = useState(0);

  const start = (id: number) => (e: PointerEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const startIndex = order.indexOf(id);
    if (startIndex < 0) return;

    // Measure once, up front: every row's centre in viewport coordinates. Everything below
    // is arithmetic on these numbers, so a row of any height reorders correctly and no
    // layout is read mid-drag.
    const centers = (Array.from(container.children) as HTMLElement[]).map((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });

    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    setDrag({ id, startIndex, pointerStartY: e.clientY, centers });
    setDy(0);
    setTarget(startIndex);
  };

  const move = (e: PointerEvent<HTMLElement>) => {
    if (!drag) return;
    const delta = e.clientY - drag.pointerStartY;
    setDy(delta);

    // The landing slot is simply how many OTHER rows sit above the dragged row's centre.
    const draggedCenter = drag.centers[drag.startIndex] + delta;
    let above = 0;
    for (let i = 0; i < drag.centers.length; i++) {
      if (i !== drag.startIndex && drag.centers[i] < draggedCenter) above++;
    }
    setTarget(above);
  };

  const end = () => {
    if (!drag) return;
    const { startIndex } = drag;
    setDrag(null);
    setDy(0);
    if (target === startIndex) return;

    const next = [...order];
    const [moved] = next.splice(startIndex, 1);
    next.splice(target, 0, moved);

    startTransition(async () => {
      setOptimisticOrder(next);
      await onReorder(next);
    });
  };

  const handleProps = (id: number): DragHandleProps => ({
    onPointerDown: start(id),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
    // touch-action: none is what stops the browser scrolling the page instead of dragging —
    // scoped to the handle so the list itself still scrolls under a finger.
    style: { touchAction: "none", cursor: drag ? "grabbing" : "grab" },
  });

  return (
    <>
      <div ref={containerRef} className={className}>
        {order.map((id, i) => {
          const dragging = drag?.id === id;

          // Rows between the row's old slot and the slot it is heading for slide by exactly
          // the gap to their neighbour, opening the hole the dragged row will drop into.
          let shift = 0;
          if (drag && !dragging) {
            const { startIndex, centers } = drag;
            if (target > startIndex && i > startIndex && i <= target) {
              shift = -(centers[i] - centers[i - 1]);
            } else if (target < startIndex && i >= target && i < startIndex) {
              shift = centers[i + 1] - centers[i];
            }
          }

          const style: CSSProperties = dragging
            ? {
                transform: `translateY(${dy}px)`,
                transition: "none",
                position: "relative",
                zIndex: 30,
                boxShadow: "var(--shadow-md)",
                borderRadius: "var(--radius-card)",
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

      {/* Present from the first render so the message is announced when it appears. */}
      <p aria-live="polite" className="mt-1 text-[12px] text-ink-300">
        {isPending ? "Saving order…" : ""}
      </p>
    </>
  );
}

/**
 * The grab affordance. `aria-hidden` on purpose: a pointer drag is not operable by keyboard
 * or screen reader, and every list using this keeps Move up / Move down in the row's overflow
 * menu — that is the accessible path, and it stays the only one announced.
 */
export function DragHandle(props: DragHandleProps) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className="-ml-1 inline-flex h-11 w-7 shrink-0 items-center justify-center text-ink-300 select-none"
    >
      <GripVertical size={18} />
    </span>
  );
}
