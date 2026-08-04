import { formatRupiah } from "@/lib/format";

/** Green under 80%, amber to 100%, red past it. */
export function usageColor(pct: number): string {
  if (pct > 100) return "var(--color-negative-500)";
  if (pct >= 80) return "var(--color-warning-500)";
  return "var(--color-positive-500)";
}

/**
 * A small SVG ring showing percentage of a budget used.
 *
 * Server component — it is pure geometry, so there is no reason to ship it to the client.
 * The arc caps at 100% so an overspend still reads as a full ring rather than wrapping round
 * and looking like a small one.
 */
export default function ProgressRing({
  pct,
  size = 44,
  stroke = 4,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(100, Math.max(0, pct));
  const offset = circumference * (1 - filled / 100);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${Math.round(pct)}% used`}
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-cream-200)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={usageColor(pct)}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={size * 0.28}
        fontWeight={700}
        fill="var(--color-ink-900)"
      >
        {Math.round(pct)}
      </text>
    </svg>
  );
}

/** "Rp 40,000 left" / "Rp 12,000 over" — the sentence a ring alone cannot say. */
export function remainingLabel(spent: number, budget: number): string {
  const diff = budget - spent;
  return diff >= 0
    ? `${formatRupiah(diff)} left`
    : `${formatRupiah(Math.abs(diff))} over`;
}
