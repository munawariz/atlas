const { SectionHeading, FeatureTile, PhoneFrame, Button, SegmentedControl, BarChart, TransactionRow, Card, Icon, BankCard } = window.AtlasDesignSystem_92c2f4;

function TransactionsPeek() {
  return (
    <div style={{ position: "relative", marginTop: 26, marginBottom: -110, display: "flex", justifyContent: "center" }}>
      <PhoneFrame width={280}>
        <div style={{ padding: "14px 18px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Icon name="chevron-left" size={20} color="var(--ink-900)" />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-900)" }}>Transactions</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
              <Icon name="sliders-horizontal" size={16} color="var(--ink-900)" />Filter
            </span>
          </div>
          <TransactionRow style={{ padding: "12px 14px" }} title="Transaction" meta="November 20" amount="-$120.30" chevron />
          <TransactionRow style={{ padding: "12px 14px" }} icon="wallet" title="Card top-up" meta="November 18" amount="+$400.00" direction="in" />
        </div>
      </PhoneFrame>
      <div style={{ position: "absolute", left: -6, top: 74, right: -6 }}>
        <Card elevation="md" pad="none" radius="md">
          <TransactionRow icon="hand-coins" title="Barclays Bank Deposit" amount="+288.00" direction="in" />
        </Card>
      </div>
    </div>
  );
}

function SpendingPeek() {
  const [tab, setTab] = React.useState("expenses");
  const income = [{ label: "Mar", value: 44 }, { label: "Apr", value: 100 }, { label: "May", value: 58 }, { label: "Jun", value: 86 }, { label: "July", value: 52 }, { label: "Aug", value: 70 }];
  const expenses = [{ label: "Mar", value: 62 }, { label: "Apr", value: 38 }, { label: "May", value: 94 }, { label: "Jun", value: 46 }, { label: "July", value: 78 }, { label: "Aug", value: 55 }];
  return (
    <div style={{ marginTop: 26, marginBottom: -70 }}>
      <Card elevation="sm" pad="sm" radius="lg" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SegmentedControl value={tab} onChange={setTab} options={[{ value: "income", label: "Income", icon: "arrow-down-left" }, { value: "expenses", label: "Expenses", icon: "arrow-up-right" }]} />
        <BarChart data={tab === "income" ? income : expenses} height={170} />
      </Card>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" style={{ padding: "104px 48px 120px" }}>
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", display: "flex", flexDirection: "column", gap: 56 }}>
        <SectionHeading align="center" eyebrow="Our features" size="display-2" title={<>4 Quick Steps To Use Our<br />Atlas Services</>} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <FeatureTile pad={40} icon="wallet" title="Get paid up within two days early." body="Use your Atlas debit card to earn automatic cash back rewards at select retailers, including grocery stores, apparel shops, restaurants and more.">
            <TransactionsPeek />
          </FeatureTile>
          <FeatureTile pad={40} tone="sage" icon="line-chart" title="Track the spending money that matters to you" body="That's the beauty of the Watchlist. You decide which spending categories need a little extra attention. Whether you're looking to cut back on dining out or make sure.">
            <SpendingPeek />
          </FeatureTile>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
          <FeatureTile tone="sage" icon="globe" title={<>Send money here<br />to anywhere</>}>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
              <Card elevation="sm" pad="none" radius="md" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--sage-200)", flex: "0 0 auto" }} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "var(--ink-900)" }}>USD</span>
                <Icon name="arrow-up-right" size={18} color="var(--forest-800)" />
              </Card>
              <Card pad="none" radius="md" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", opacity: 0.55 }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--sage-200)", flex: "0 0 auto" }} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "var(--ink-900)" }}>BDT</span>
              </Card>
            </div>
          </FeatureTile>
          <FeatureTile icon="gift" title={<>Mastercard and<br />Clave cards</>}>
            <div style={{ marginTop: 18, marginBottom: -90, marginLeft: 20, transform: "rotate(-12deg)" }}>
              <BankCard width={230} finish="sage" network="Mastercard" />
            </div>
          </FeatureTile>
          <FeatureTile tone="forest" icon={null} title={<>Explore our other<br />product feature</>} action={<Button variant="accent" icon="chevron-right" style={{ marginTop: 14, alignSelf: "flex-start" }}>View More</Button>}>
            <div style={{ position: "absolute", right: -60, bottom: -70, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
          </FeatureTile>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { FeaturesSection, TransactionsPeek, SpendingPeek });
