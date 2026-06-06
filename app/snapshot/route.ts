import ExcelJS from "exceljs";
import { gatherSnapshot } from "@/lib/snapshot";
import { todayISO } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RP = "#,##0"; // rupiah number format

type Col = { h: string; w?: number; money?: boolean };

function sheet(wb: ExcelJS.Workbook, name: string, cols: Col[], rows: (string | number | null)[][], total?: (string | number | null)[]) {
  const ws = wb.addWorksheet(name);
  ws.columns = cols.map((c) => ({ header: c.h, width: c.w ?? 16, style: c.money ? { numFmt: RP } : {} }));
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  if (total) {
    const tr = ws.addRow(total);
    tr.font = { bold: true };
  }
  return ws;
}

export async function GET(request: Request) {
  const reqYear = parseInt(new URL(request.url).searchParams.get("year") ?? "", 10);
  const year = Number.isFinite(reqYear) && reqYear >= 2000 && reqYear <= 2100 ? reqYear : Number(todayISO().slice(0, 4));

  const s = await gatherSnapshot(year);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Finance Tracker";

  // ---- Summary ----
  const sum = wb.addWorksheet("Summary");
  sum.columns = [
    { header: "Item", width: 34 },
    { header: "Amount (Rp)", width: 20, style: { numFmt: RP } },
  ];
  sum.getRow(1).font = { bold: true };
  sum.addRow([`Snapshot of ${s.year}`, ""]);
  sum.addRow(["Generated on", s.generatedOn]);
  sum.addRow([]);
  sum.addRow([`This year's flows`, ""]).font = { bold: true };
  sum.addRow(["Income", s.income]);
  sum.addRow(["Expense", s.expense]);
  sum.addRow(["Saving", s.saving]);
  sum.addRow(["Investment", s.investment]);
  sum.addRow(["Net (income - expense - saving - invest)", s.net]);
  sum.addRow([]);
  sum.addRow([`Status at end of ${s.year}`, ""]).font = { bold: true };
  sum.addRow(["Net worth (wallet cash)", s.netWorth]);
  sum.addRow(["  change vs start of year", s.netWorth - s.netWorthStart]);
  sum.addRow(["Savings & investments (at cost)", s.savingsTotal]);
  if (s.isCurrentYear) sum.addRow(["    - Stocks at market value (live)", s.stocksValue]);
  sum.addRow(["    - Stocks at cost", s.stocksCost]);
  sum.addRow(["    - Bonds principal", s.bondsPrincipal]);
  sum.addRow(["    - Bond coupons (all time)", s.bondsCoupons]);
  sum.addRow(["Forex (IDR value)", s.forexTotal]);
  sum.addRow(["Loans to collect", s.loansOutstanding]);
  sum.addRow(["Paylater remaining (owed)", -s.paylaterRemaining]);
  sum.addRow([]);
  sum.addRow(["Tracked net total", s.trackedTotal]).font = { bold: true };
  sum.addRow([]);
  sum.addRow(["Note: savings already includes stocks & bonds at cost; loans/paylater are current status."]);

  // ---- Transactions (that year) ----
  sheet(
    wb,
    "Transactions",
    [
      { h: "Date", w: 12 },
      { h: "Type", w: 12 },
      { h: "Amount (Rp)", w: 16, money: true },
      { h: "Category", w: 18 },
      { h: "From", w: 14 },
      { h: "To", w: 14 },
      { h: "Description", w: 32 },
    ],
    s.transactions.map((t) => [t.date, t.type, t.amount, t.category, t.from, t.to, t.description])
  );

  // ---- Wallets (year-end) ----
  sheet(
    wb,
    "Wallets",
    [{ h: "Wallet", w: 20 }, { h: "Balance (Rp)", w: 18, money: true }],
    s.wallets.map((r) => [r.name, r.balance]),
    ["TOTAL", s.netWorth]
  );

  // ---- Savings (year-end) ----
  sheet(
    wb,
    "Savings",
    [{ h: "Bucket", w: 20 }, { h: "Kind", w: 12 }, { h: "Balance (Rp)", w: 18, money: true }],
    s.savings.map((r) => [r.name, r.kind, r.balance]),
    ["TOTAL", "", s.savingsTotal]
  );

  // ---- Stocks (year-end) ----
  sheet(
    wb,
    "Stocks",
    [
      { h: "Ticker", w: 12 },
      { h: "Lots", w: 10 },
      { h: "Avg/share", w: 12, money: true },
      { h: "Cost (Rp)", w: 16, money: true },
      { h: "Price", w: 12, money: true },
      { h: "Market value (Rp)", w: 18, money: true },
      { h: "Unrealized P/L", w: 16, money: true },
    ],
    s.stocks.map((r) => [r.ticker, r.lots, r.avgPerShare, r.cost, r.price, r.value, r.pl]),
    ["TOTAL", "", "", s.stocksCost, "", s.stocksValue || null, s.isCurrentYear ? s.stocksValue - s.stocksCost : null]
  );

  // ---- Bonds (year-end) ----
  sheet(
    wb,
    "Bonds",
    [
      { h: "Bond", w: 16 },
      { h: "Units", w: 10 },
      { h: "Principal (Rp)", w: 16, money: true },
      { h: "Coupons (Rp)", w: 16, money: true },
    ],
    s.bonds.map((r) => [r.name, r.units, r.principal, r.coupons]),
    ["TOTAL", "", s.bondsPrincipal, s.bondsCoupons]
  );

  // ---- Forex (year-end) ----
  sheet(
    wb,
    "Forex",
    [
      { h: "Account", w: 16 },
      { h: "Currency", w: 10 },
      { h: "Units", w: 14 },
      { h: "Rate (IDR)", w: 14, money: true },
      { h: "Value (IDR)", w: 16, money: true },
    ],
    s.forex.map((r) => [r.name, r.currency, r.units, Math.round(r.rate), r.idr]),
    ["TOTAL", "", "", "", s.forexTotal]
  );

  // ---- Loans (current status) ----
  sheet(
    wb,
    "Loans",
    [
      { h: "Person", w: 18 },
      { h: "Installment (Rp)", w: 16, money: true },
      { h: "Months left", w: 12 },
      { h: "Outstanding (Rp)", w: 18, money: true },
    ],
    s.loans.map((r) => [r.person, r.installment, r.monthsLeft, r.outstanding]),
    ["TOTAL", "", "", s.loansOutstanding]
  );

  // ---- Paylater (current status) ----
  sheet(
    wb,
    "Paylater",
    [
      { h: "Item", w: 22 },
      { h: "Monthly (Rp)", w: 16, money: true },
      { h: "Months left", w: 12 },
      { h: "Remaining (Rp)", w: 18, money: true },
    ],
    s.paylater.map((r) => [r.item, r.monthly, r.monthsLeft, r.remaining]),
    ["TOTAL", "", "", s.paylaterRemaining]
  );

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="finance-snapshot-${s.year}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
