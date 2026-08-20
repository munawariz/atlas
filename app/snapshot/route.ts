import ExcelJS from "exceljs";
import { gatherSnapshot } from "@/lib/snapshot";
import { formatMonth } from "@/lib/format";
import type { NextRequest } from "next/server";

// exceljs needs Node APIs — this cannot run on the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONEY = "#,##0";

interface Column {
  header: string;
  width: number;
  /** Format money columns and bold them in TOTAL rows. */
  money?: boolean;
}

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: Column[],
  rows: (string | number)[][],
  totalRow?: (string | number)[]
): void {
  const sheet = workbook.addWorksheet(name);

  sheet.columns = columns.map((column) => ({
    header: column.header,
    width: column.width,
  }));

  sheet.getRow(1).font = { bold: true };

  for (const row of rows) sheet.addRow(row);

  if (totalRow) {
    const added = sheet.addRow(totalRow);
    added.font = { bold: true };
  }

  columns.forEach((column, i) => {
    if (column.money) sheet.getColumn(i + 1).numFmt = MONEY;
  });
}

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = parseInt(yearParam ?? "", 10);
  if (!Number.isFinite(year) || year < 1900 || year > 3000) {
    return new Response("Pass a valid ?year=YYYY", { status: 400 });
  }

  const snap = await gatherSnapshot(year);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Atlas";

  const walletName = new Map(snap.wallets.map((w) => [w.id, w.name]));
  const categoryName = new Map(snap.categories.map((c) => [c.id, c.name]));

  // --- Summary -------------------------------------------------------------
  addSheet(
    workbook,
    "Summary",
    [
      { header: "Metric", width: 34 },
      { header: "Value", width: 20, money: true },
    ],
    [
      ["Year", year],
      ["Income", snap.flows.income],
      ["Expense", snap.flows.expense],
      ["Saving (net)", snap.flows.saving],
      ["Investment (net)", snap.flows.investment],
      ["Net flow", snap.flows.income - snap.flows.expense],
      ["", ""],
      ["Net worth, start of year", snap.startNetWorth],
      ["Net worth, end of year", snap.endNetWorth],
      ["Change", snap.endNetWorth - snap.startNetWorth],
      ["", ""],
      ["Savings & investment buckets", snap.savingsTotal],
      ["Forex value (not in net worth)", snap.forexTotal],
      ["Loans outstanding (owed to you)", snap.loansOutstanding],
      ["Installments remaining (you owe)", -snap.paylaterRemaining],
    ],
    ["TRACKED NET TOTAL", snap.trackedTotal]
  );

  // --- Transactions --------------------------------------------------------
  addSheet(
    workbook,
    "Transactions",
    [
      { header: "Date", width: 12 },
      { header: "Month", width: 10 },
      { header: "Type", width: 12 },
      { header: "Amount", width: 16, money: true },
      { header: "Category", width: 22 },
      { header: "From wallet", width: 16 },
      { header: "To wallet", width: 16 },
      { header: "Description", width: 34 },
    ],
    snap.transactions.map((txn) => [
      txn.occurred_on,
      formatMonth(txn.occurred_on),
      txn.type,
      txn.amount,
      txn.category_id != null ? (categoryName.get(txn.category_id) ?? "") : "",
      txn.source_wallet_id != null
        ? (walletName.get(txn.source_wallet_id) ?? "")
        : "",
      txn.dest_wallet_id != null ? (walletName.get(txn.dest_wallet_id) ?? "") : "",
      txn.description ?? "",
    ]),
    [
      "TOTAL",
      "",
      `${snap.transactions.length} rows`,
      snap.transactions.reduce((sum, t) => sum + t.amount, 0),
      "",
      "",
      "",
      "",
    ]
  );

  // --- Wallets -------------------------------------------------------------
  addSheet(
    workbook,
    "Wallets",
    [
      { header: "Wallet", width: 24 },
      { header: "Balance at year end", width: 22, money: true },
      { header: "Archived", width: 10 },
    ],
    snap.wallets.map((wallet) => [
      wallet.name,
      snap.endBalances.get(wallet.id) ?? 0,
      wallet.archived ? "yes" : "",
    ]),
    ["TOTAL", snap.endNetWorth, ""]
  );

  // --- Savings -------------------------------------------------------------
  addSheet(
    workbook,
    "Savings",
    [
      { header: "Bucket", width: 26 },
      { header: "Kind", width: 12 },
      { header: "In", width: 16, money: true },
      { header: "Out", width: 16, money: true },
      { header: "Balance", width: 16, money: true },
    ],
    snap.savings.map((bucket) => [
      bucket.name,
      bucket.kind,
      bucket.contributed,
      bucket.withdrawn,
      bucket.balance,
    ]),
    [
      "TOTAL",
      "",
      snap.savings.reduce((sum, b) => sum + b.contributed, 0),
      snap.savings.reduce((sum, b) => sum + b.withdrawn, 0),
      snap.savingsTotal,
    ]
  );

  // --- Stocks --------------------------------------------------------------
  addSheet(
    workbook,
    "Stocks",
    [
      { header: "Ticker", width: 12 },
      { header: "Lots", width: 8 },
      { header: "Cost basis", width: 16, money: true },
      { header: "Price", width: 12, money: true },
      { header: "Market value", width: 16, money: true },
      { header: "Unrealized P/L", width: 16, money: true },
      { header: "Realized P/L", width: 16, money: true },
      { header: "Dividends", width: 16, money: true },
    ],
    snap.stocks.holdings.map((holding) => [
      holding.ticker,
      holding.lots,
      holding.costBasis,
      holding.price ?? "",
      holding.value ?? "",
      holding.unrealizedPl ?? "",
      holding.realizedPl,
      holding.dividends,
    ]),
    [
      "TOTAL",
      snap.stocks.holdings.reduce((sum, h) => sum + h.lots, 0),
      snap.stocks.totalCost,
      "",
      snap.stocks.pricedValue,
      snap.stocks.unrealizedPl,
      snap.stocks.lifetimeRealizedPl,
      snap.stocks.totalDividends,
    ]
  );

  // --- Bonds ---------------------------------------------------------------
  addSheet(
    workbook,
    "Bonds",
    [
      { header: "Bond", width: 30 },
      { header: "Units", width: 14 },
      { header: "Principal", width: 16, money: true },
      { header: "Coupons", width: 16, money: true },
    ],
    snap.bonds.holdings.map((holding) => [
      holding.name,
      holding.units,
      holding.invested,
      holding.coupons,
    ]),
    ["TOTAL", "", snap.bonds.totalInvested, snap.bonds.totalCoupons]
  );

  // --- Crypto --------------------------------------------------------------
  addSheet(
    workbook,
    "Crypto",
    [
      { header: "Coin", width: 12 },
      { header: "Units", width: 16 },
      { header: "Cost basis", width: 16, money: true },
      { header: "Price (IDR)", width: 18, money: true },
      { header: "Market value", width: 16, money: true },
      { header: "Unrealized P/L", width: 16, money: true },
      { header: "Realized P/L", width: 16, money: true },
    ],
    snap.crypto.holdings.map((holding) => [
      holding.symbol,
      holding.units,
      holding.costBasis,
      holding.price ?? "",
      holding.value ?? "",
      holding.unrealizedPl ?? "",
      holding.realizedPl,
    ]),
    [
      "TOTAL",
      "",
      snap.crypto.totalCost,
      "",
      snap.crypto.pricedValue,
      snap.crypto.unrealizedPl,
      snap.crypto.lifetimeRealizedPl,
    ]
  );

  // --- Forex ---------------------------------------------------------------
  addSheet(
    workbook,
    "Forex",
    [
      { header: "Account", width: 20 },
      { header: "Currency", width: 10 },
      { header: "Units", width: 16 },
      { header: "Invested (IDR)", width: 18, money: true },
      { header: "Value (IDR)", width: 18, money: true },
      { header: "Realized P/L", width: 16, money: true },
      { header: "Rate", width: 14, money: true },
    ],
    snap.forex.map((row) => [
      row.name,
      row.currency,
      row.units,
      row.invested,
      row.value,
      row.realizedPl,
      Math.round(row.rate),
    ]),
    [
      "TOTAL",
      "",
      "",
      snap.forex.reduce((sum, f) => sum + f.invested, 0),
      snap.forexTotal,
      snap.forex.reduce((sum, f) => sum + f.realizedPl, 0),
      "",
    ]
  );

  // --- Loans ---------------------------------------------------------------
  addSheet(
    workbook,
    "Loans",
    [
      { header: "Person", width: 22 },
      { header: "Via", width: 18 },
      { header: "Monthly", width: 14, money: true },
      { header: "Expected", width: 16, money: true },
      { header: "Collected", width: 16, money: true },
      { header: "Outstanding", width: 16, money: true },
      { header: "Note", width: 28 },
    ],
    snap.loans.map((loan) => [
      loan.person,
      loan.lender ?? "",
      loan.installment,
      loan.expected,
      loan.collected,
      loan.outstanding,
      loan.note ?? "",
    ]),
    [
      "TOTAL",
      "",
      "",
      snap.loans.reduce((sum, l) => sum + l.expected, 0),
      snap.loans.reduce((sum, l) => sum + l.collected, 0),
      snap.loansOutstanding,
      "",
    ]
  );

  // --- Paylater ------------------------------------------------------------
  addSheet(
    workbook,
    "Paylater",
    [
      { header: "Item", width: 28 },
      { header: "Monthly", width: 14, money: true },
      { header: "First month", width: 14 },
      { header: "Last month", width: 14 },
      { header: "Paid months", width: 12 },
      { header: "Total months", width: 12 },
      { header: "Remaining", width: 16, money: true },
    ],
    snap.paylater.map((item) => [
      item.item,
      item.monthly_amount,
      formatMonth(item.first_month_date),
      formatMonth(item.last_month_date),
      item.paidMonths,
      item.totalMonths,
      item.remaining,
    ]),
    ["TOTAL", "", "", "", "", "", snap.paylaterRemaining]
  );

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="finance-snapshot-${year}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
