"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * A single-select pill row where ONE pill element glides between options — the
 * animation AddSheet's picker tabs introduced, extracted so every pill switcher
 * in the app moves the same way.
 *
 * Each option button registers itself in a ref map; whenever the value changes the
 * pill is re-measured to the active button's offset/size and slides there. The first
 * measurement (mount, or first pick when nothing was selected) renders in place
 * instead of sliding in from the edge. Resizes snap without animating.
 */

export interface PillOption<K extends string | number = string> {
  key: K;
  label: ReactNode;
  /** Sliding-pill colour when this option is active. Default: solid forest. */
  pillClassName?: string;
  /** Label colour while this option is active. Default: white. */
  activeTextClassName?: string;
}

interface PillRect {
  left: number;
  top: number;
  width: number;
  height: number;
  className: string;
  animate: boolean;
}

function sameRect(a: PillRect, b: PillRect): boolean {
  return (
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height &&
    a.className === b.className
  );
}

export default function PillSwitcher<K extends string | number = string>({
  options,
  value,
  onChange,
  ariaLabel,
  bordered = true,
  grow = false,
  wrap = false,
  scrollable = false,
  scrollClassName = "",
  sizeClassName = "h-[38px] px-[18px] text-[14px]",
  gapClassName = "gap-2",
}: {
  options: PillOption<K>[];
  /** null renders the row with no pill — nothing selected yet. */
  value: K | null;
  onChange: (key: K) => void;
  ariaLabel?: string;
  /** Unselected options keep the chip outline; false = plain tab labels. */
  bordered?: boolean;
  /** Every option stretches equally — a full-width segmented control. */
  grow?: boolean;
  /** Options wrap onto multiple lines; the pill glides in both axes. */
  wrap?: boolean;
  /** Row lives in its own horizontal scroller that keeps the active option in view. */
  scrollable?: boolean;
  /** Extra classes (padding etc.) for the scroller when `scrollable`. */
  scrollClassName?: string;
  sizeClassName?: string;
  gapClassName?: string;
}) {
  const itemRefs = useRef(new Map<K, HTMLButtonElement>());
  const rowRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // The previously-measured key: null means the pill has never been placed, so the
  // next placement must not animate (nor smooth-scroll) from nowhere.
  const prevKey = useRef<K | null>(null);
  const [pill, setPill] = useState<PillRect | null>(null);

  const active = value !== null ? options.find((o) => o.key === value) ?? null : null;
  const activeKey = active ? active.key : null;
  const activePill = active?.pillClassName ?? "bg-forest-800";

  useLayoutEffect(() => {
    if (activeKey === null) {
      prevKey.current = null;
      setPill(null);
      return;
    }
    const el = itemRefs.current.get(activeKey);
    if (!el) return;

    const measure = (animate: boolean) => {
      const next: PillRect = {
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
        className: activePill,
        animate,
      };
      // Bail out on identical geometry — this effect re-runs on every parent render
      // (options are usually rebuilt inline), and returning `prev` stops the loop.
      setPill((prev) => (prev && sameRect(prev, next) ? prev : next));
    };

    const first = prevKey.current === null;
    const changed = prevKey.current !== activeKey;
    prevKey.current = activeKey;
    measure(!first);

    // Keep the active option in view — centred where the row allows — but only when
    // the selection actually moved, so re-renders never yank a hand-panned row back.
    const scroller = scrollerRef.current;
    if (scroller && changed) {
      scroller.scrollTo({
        left: el.offsetLeft - (scroller.clientWidth - el.offsetWidth) / 2,
        behavior: first ? "auto" : "smooth",
      });
    }

    // Layout shifts (rotation, flex-1 rows, chip wrap reflow) snap the pill into
    // place without a glide.
    const ro = new ResizeObserver(() => measure(false));
    ro.observe(el);
    if (rowRef.current) ro.observe(rowRef.current);
    return () => ro.disconnect();
  }, [activeKey, activePill, options]);

  const base = `relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-full transition-colors duration-200 ${sizeClassName} ${
    grow ? "flex-1" : "shrink-0"
  } ${bordered ? "border" : ""}`;
  const idle = bordered
    ? "border-[var(--border-default)] font-medium text-ink-700 hover:border-forest-800 hover:text-forest-800"
    : "font-medium text-ink-500 hover:text-forest-800";

  const row = (
    <div
      ref={rowRef}
      role="group"
      aria-label={ariaLabel}
      className={`relative flex items-center ${gapClassName} ${
        wrap ? "flex-wrap" : grow ? "" : "w-max"
      }`}
    >
      {/* The one pill, sliding underneath the labels. */}
      {pill && (
        <span
          aria-hidden
          className={`absolute left-0 top-0 rounded-full ${pill.className}`}
          style={{
            width: pill.width,
            height: pill.height,
            transform: `translate(${pill.left}px, ${pill.top}px)`,
            transition: pill.animate
              ? "transform 0.28s var(--ease-standard), width 0.28s var(--ease-standard), background-color 0.28s var(--ease-standard)"
              : "none",
          }}
        />
      )}
      {options.map((option) => {
        const isActive = option.key === value;
        return (
          <button
            key={option.key}
            ref={(el) => {
              if (el) itemRefs.current.set(option.key, el);
              else itemRefs.current.delete(option.key);
            }}
            type="button"
            onClick={() => onChange(option.key)}
            aria-pressed={isActive}
            className={`${base} ${
              isActive
                ? `font-semibold ${bordered ? "border-transparent" : ""} ${
                    option.activeTextClassName ?? "text-white"
                  }`
                : idle
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  if (!scrollable) return row;
  return (
    <div
      ref={scrollerRef}
      className={`overflow-x-auto no-scrollbar ${scrollClassName}`}
      onWheel={(e) => {
        // Desktop mice only wheel vertically; steer it sideways so the row pans
        // without a visible scrollbar. Touch swiping is untouched.
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.currentTarget.scrollLeft += e.deltaY;
        }
      }}
    >
      {row}
    </div>
  );
}
