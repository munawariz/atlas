const { BankCard, QuickActions, TransactionRow, Avatar, Chip, Icon } = window.AtlasDesignSystem_92c2f4;

const ACTIVITY = [
  { id: 1, period: "day", title: "David Anderson", meta: "Today · Payment received", amount: "+$250.00", direction: "in", avatar: "David Anderson" },
  { id: 2, period: "day", title: "Blue Bottle Coffee", meta: "Today · Card payment", amount: "-$6.40", icon: "cup-soda" },
  { id: 3, period: "week", title: "Barclays Bank Deposit", meta: "30 Jun · Salary", amount: "+288.00", direction: "in", icon: "hand-coins" },
  { id: 4, period: "week", title: "Netflix", meta: "28 Jun · Subscription", amount: "-$15.99", icon: "monitor-play" },
  { id: 5, period: "month", title: "Rent — 44 Halsey St", meta: "01 Jun · Transfer", amount: "-$1,850.00", icon: "house" },
  { id: 6, period: "month", title: "Dribbble Pro", meta: "04 Jun · Subscription", amount: "-$60.00", icon: "dribbble" },
];

const ORDER = { day: 1, week: 2, month: 3, "6months": 4 };

function HomeScreen({ onAction }) {
  const [period, setPeriod] = React.useState("week");
  const rows = ACTIVITY.filter((a) => ORDER[a.period] <= ORDER[period]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 20px 24px", background: "var(--cream-100)", flex: 1, overflowY: "auto" }}>
      <div style={{ position: "relative" }}>
          <div style={{ position: "relative" }}><BankCard width={350} /></div>
      </div>
      <QuickActions onSelect={(a) => onAction && onAction(a)} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-900)" }}>Recent Activity</span>
        <Icon name="ellipsis" size={20} color="var(--ink-500)" />
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {[["day", "This day"], ["week", "This week"], ["month", "This month"], ["6months", "6 months"]].map(([id, label]) => (
          <Chip key={id} selected={period === id} onSelect={() => setPeriod(id)}>{label}</Chip>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => (
          <TransactionRow key={r.id} title={r.title} meta={r.meta} amount={r.amount} direction={r.direction} icon={r.icon} chevron
            avatar={r.avatar ? <Avatar name={r.avatar} size={44} /> : undefined} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen });
