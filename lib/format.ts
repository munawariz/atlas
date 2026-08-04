// Formatting helpers. Everything localizable funnels through the two constants below, so a
// language swap is a single edit rather than a hunt through the tree (ATLAS.md §0.1).
//
// No `server-only` here — client components import this.

export const LOCALE = "en-US"; // number grouping + month names
export const CURRENCY = "IDR"; // the money being tracked — independent of LOCALE

// Hardcoded English month names rather than toLocaleDateString: keeps output stable regardless
// of server locale, and monthName() is called in tight render loops.
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const decimalFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
});

// `narrowSymbol` renders IDR as "Rp" rather than the verbose "IDR". Some runtimes lack
// narrow-symbol data for IDR — detect that once and fall back to prefixing "Rp " ourselves.
// We must never ship "IDR 7,761,691".
const currencyFormatter = (() => {
  try {
    const fmt = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: CURRENCY,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });
    if (fmt.format(1).includes(CURRENCY)) return null; // no narrow-symbol data
    return fmt;
  } catch {
    return null;
  }
})();

/** "Rp 7,761,691" */
export function formatRupiah(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  if (currencyFormatter) return currencyFormatter.format(value);
  const abs = decimalFormatter.format(Math.abs(value));
  return value < 0 ? `-Rp ${abs}` : `Rp ${abs}`;
}

/** "7,761,691" */
export function formatNumber(n: number): string {
  return decimalFormatter.format(Number.isFinite(n) ? n : 0);
}

/**
 * Compact money: "Rp 7.8M" | "Rp 950K" | "Rp 1M" | "Rp 1.2B".
 *
 * Thresholds sit at 999.5 x unit rather than 1000 x unit, so a value that rounds up
 * (999,900) carries into the next unit as "1M" instead of overflowing its own as "1000K".
 * One decimal, with a trailing ".0" dropped.
 */
export function formatRupiahShort(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  let scaled: number;
  let suffix: string;
  if (abs >= 999.5e6) {
    scaled = abs / 1e9;
    suffix = "B";
  } else if (abs >= 999.5e3) {
    scaled = abs / 1e6;
    suffix = "M";
  } else if (abs >= 999.5) {
    scaled = abs / 1e3;
    suffix = "K";
  } else {
    return `${sign}Rp ${decimalFormatter.format(abs)}`;
  }

  const text = scaled.toFixed(1).replace(/\.0$/, "");
  return `${sign}Rp ${text}${suffix}`;
}

/** 1..12 -> "January".."December" */
export function monthName(m: number): string {
  return MONTHS[Math.min(11, Math.max(0, Math.round(m) - 1))];
}

/** 1..12 -> "Jan".."Dec" */
export function monthNameShort(m: number): string {
  return MONTHS_SHORT[Math.min(11, Math.max(0, Math.round(m) - 1))];
}

/**
 * Local-time YYYY-MM-DD. Offset-corrected before toISOString(), or the date flips near
 * midnight in non-UTC timezones (ATLAS.md §14.7).
 */
export function todayISO(d: Date = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** "2026-03-01" -> "Mar 2026" */
export function formatMonth(iso: string): string {
  const [y, m] = String(iso ?? "").split("-");
  const idx = parseInt(m ?? "", 10);
  if (!y || !Number.isFinite(idx)) return String(iso ?? "");
  return `${monthNameShort(idx)} ${y}`;
}

/** "2026-03-01" -> "Mar '26" */
export function formatMonthShort(iso: string): string {
  const [y, m] = String(iso ?? "").split("-");
  const idx = parseInt(m ?? "", 10);
  if (!y || !Number.isFinite(idx)) return String(iso ?? "");
  return `${monthNameShort(idx)} '${y.slice(2)}`;
}

/** "2026-06-05" -> "5 Jun" */
export function formatDateShort(iso: string): string {
  const [, m, d] = String(iso ?? "").split("-");
  const idx = parseInt(m ?? "", 10);
  const day = parseInt(d ?? "", 10);
  if (!Number.isFinite(idx) || !Number.isFinite(day)) return String(iso ?? "");
  return `${day} ${monthNameShort(idx)}`;
}

/** "2026-06-05" -> "Mon, 5" — used by DaySwitcher. All arithmetic in UTC. */
export function formatDayLabel(iso: string): string {
  const [y, m, d] = String(iso ?? "").split("-").map((p) => parseInt(p, 10));
  if (![y, m, d].every(Number.isFinite)) return String(iso ?? "");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${days[dow]}, ${d}`;
}
