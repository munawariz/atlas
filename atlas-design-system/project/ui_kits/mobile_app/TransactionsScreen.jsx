const { TransactionRow, Avatar, Input, Card, Icon, Chip } = window.AtlasDesignSystem_92c2f4;

const ALL = [
  { title: "Barclays Bank Deposit", meta: "November 20 · Salary", amount: "+288.00", direction: "in", icon: "hand-coins", type: "in" },
  { title: "Transaction", meta: "November 20", amount: "-$120.30", icon: "credit-card", type: "out" },
  { title: "Ana Ruiz", meta: "November 19 · Request paid", amount: "+$60.00", direction: "in", avatar: "Ana Ruiz", type: "in" },
  { title: "Themeforest", meta: "November 18 · Subscription", amount: "-$8.65", icon: "shopping-bag", type: "out" },
  { title: "Whole Foods Market", meta: "November 17 · Card payment", amount: "-$74.12", icon: "shopping-cart", type: "out" },
  { title: "Cashback reward", meta: "November 16 · Perks", amount: "+$4.80", direction: "in", icon: "gift", type: "in" },
  { title: "Transport for London", meta: "November 15 · Card payment", amount: "-$18.40", icon: "train-front", type: "out" },
];

function TransactionsScreen() {
  const [filter, setFilter] = React.useState("all");
  const [q, setQ] = React.useState("");
  const rows = ALL.filter((r) => (filter === "all" || r.type === filter) && r.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 20px 24px", background: "var(--cream-100)", flex: 1, overflowY: "auto" }}>
      <Input placeholder="Search transactions" icon="search" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ display: "flex", gap: 8 }}>
        {[["all", "All"], ["in", "Money in"], ["out", "Money out"]].map(([id, label]) => (
          <Chip key={id} selected={filter === id} onSelect={() => setFilter(id)}>{label}</Chip>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r, i) => (
          <TransactionRow key={i} title={r.title} meta={r.meta} amount={r.amount} direction={r.direction} icon={r.icon} chevron
            avatar={r.avatar ? <Avatar name={r.avatar} size={44} /> : undefined} />
        ))}
        {!rows.length && (
          <Card tone="white" pad="md" style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Nothing matches that search.</Card>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { TransactionsScreen });
