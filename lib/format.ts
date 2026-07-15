// Indonesian Rupiah + date helpers. Amounts are integer rupiah.

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const idrPlain = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** "Rp 7.761.691" */
export function formatRupiah(n: number | null | undefined): string {
  return idr.format(Math.round(n ?? 0));
}

/** "7.761.691" (no symbol) */
export function formatNumber(n: number | null | undefined): string {
  return idrPlain.format(Math.round(n ?? 0));
}

/** Compact form for tight UI: "Rp 7,8jt", "Rp 950rb", "Rp 1jt". */
export function formatRupiahShort(n: number | null | undefined): string {
  const v = Math.round(n ?? 0);
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  // One decimal, dropping a trailing ",0" so 1_000_000 → "1jt" (not "1,0jt").
  const dec = (x: number) => {
    const s = x.toFixed(1);
    return (s.endsWith(".0") ? s.slice(0, -2) : s).replace(".", ",");
  };
  // Thresholds sit at 999.5×unit so a value that rounds up (e.g. 999.900) carries into the
  // next unit ("1jt") instead of overflowing its own ("1000rb").
  if (abs >= 999_500_000) return `${sign}Rp ${dec(abs / 1_000_000_000)}M`;
  if (abs >= 999_500) return `${sign}Rp ${dec(abs / 1_000_000)}jt`;
  if (abs >= 1_000) return `${sign}Rp ${Math.round(abs / 1_000)}rb`;
  return `${sign}Rp ${abs}`;
}

/** Parse a free-typed amount ("25.000", "25000", "25rb", "1,5jt") into integer rupiah. */
export function parseAmount(raw: string): number {
  if (!raw) return 0;
  let s = raw.toLowerCase().trim().replace(/\s/g, "");
  let mult = 1;
  if (s.endsWith("jt") || s.endsWith("m")) {
    mult = 1_000_000;
    s = s.replace(/(jt|m)$/, "");
  } else if (s.endsWith("rb") || s.endsWith("k")) {
    mult = 1_000;
    s = s.replace(/(rb|k)$/, "");
  }
  if (mult > 1) {
    // decimal allowed with multiplier, e.g. "1,5jt"
    const num = parseFloat(s.replace(/\./g, "").replace(",", "."));
    return Math.round((isNaN(num) ? 0 : num) * mult);
  }
  // plain rupiah: strip thousands separators (both . and ,)
  const digits = s.replace(/[.,]/g, "");
  const num = parseInt(digits, 10);
  return isNaN(num) ? 0 : num;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthName(m: number): string {
  return MONTH_NAMES[m - 1] ?? "";
}

/** "YYYY-MM-DD" for today in local time. */
export function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/** First day of a month as "YYYY-MM-01". */
export function monthKey(year: number, month1to12: number): string {
  return `${year}-${String(month1to12).padStart(2, "0")}-01`;
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Mar 2026" from a YYYY-MM-01 string. */
export function formatMonth(iso: string): string {
  const [y, m] = iso.slice(0, 10).split("-").map(Number);
  return `${MONTH_ABBR[(m || 1) - 1]} ${y}`;
}

/** "Mar '26" compact month label. */
export function formatMonthShort(iso: string): string {
  const [y, m] = iso.slice(0, 10).split("-").map(Number);
  return `${MONTH_ABBR[(m || 1) - 1]} '${String(y).slice(2)}`;
}

/** "5 Jun" style short date from an ISO date string. */
export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[(m || 1) - 1]}`;
}
