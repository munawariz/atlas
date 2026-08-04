const { SegmentedControl, BarChart, Card, TransactionRow, Avatar, StatBlock } = window.AtlasDesignSystem_92c2f4;

const INCOME = [{ label: "Mar", value: 44 }, { label: "Apr", value: 100 }, { label: "May", value: 58 }, { label: "Jun", value: 86 }, { label: "July", value: 52 }, { label: "Aug", value: 70 }];
const EXPENSES = [{ label: "Mar", value: 62 }, { label: "Apr", value: 38 }, { label: "May", value: 94 }, { label: "Jun", value: 46 }, { label: "July", value: 78 }, { label: "Aug", value: 55 }];

function StatisticsScreen() {
  const [tab, setTab] = React.useState("income");
  const income = tab === "income";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "0 20px 24px", background: "var(--cream-100)", flex: 1, overflowY: "auto" }}>
      <SegmentedControl value={tab} onChange={setTab} options={[{ value: "income", label: "Income", icon: "arrow-down-left" }, { value: "expenses", label: "Expenses", icon: "arrow-up-right" }]} />
      <Card tone="white" pad="sm" radius="lg" elevation="sm" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <StatBlock size="md" value={income ? "$8,420" : "$5,116"} label={income ? "Received, last 6 months" : "Spent, last 6 months"} />
          <StatBlock size="sm" value={income ? "+12%" : "-4%"} label="vs. previous" />
        </div>
        <BarChart data={income ? INCOME : EXPENSES} height={190} />
      </Card>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-900)" }}>Transaction History</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(income
          ? [["Barclays Bank Deposit", "30 Jun · Salary", "+288.00", "hand-coins"], ["Ana Ruiz", "19 Jun · Request paid", "+$60.00", null], ["Cashback reward", "16 Jun · Perks", "+$4.80", "gift"]]
          : [["Netflix", "22 Jun at 11:20 pm", "-$15.99", "monitor-play"], ["Dribbble", "04 Jun at 11:00 am", "-$12.99", "dribbble"], ["Themeforest", "26 Aug at 11:00 am", "-$8.65", "shopping-bag"]]
        ).map(([title, meta, amount, icon]) => (
          <TransactionRow key={title} title={title} meta={meta} amount={amount} direction={income ? "in" : "out"} icon={icon || undefined}
            avatar={icon ? undefined : <Avatar name={title} size={44} />} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { StatisticsScreen });
