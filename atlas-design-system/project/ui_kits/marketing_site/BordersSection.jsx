const { SectionHeading, Button, PhoneFrame, Card, IconButton, AmountField, TransactionRow, Avatar, SegmentedControl, BarChart } = window.AtlasDesignSystem_92c2f4;

function BordersSection() {
  const [ccy, setCcy] = React.useState("USD");
  return (
    <section id="borders" style={{ padding: "0 48px 120px" }}>
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", display: "flex", flexDirection: "column", gap: 40 }}>
        <SectionHeading size="display-2" title={<>Meet Money Without<br />Borders</>} action={<Button>Send Money Now</Button>} />
        <div style={{ position: "relative", background: "var(--cream-100)", borderRadius: "var(--radius-2xl)", padding: "48px 56px", minHeight: 420, display: "flex", justifyContent: "center" }}>
          <div style={{ position: "absolute", right: 40, top: -30 }}>
            <IconButton icon="arrow-up-right" tone="accent" size="xl" label="Start a transfer" />
          </div>
          <PhoneFrame width={300} bezel="ink">
            <div style={{ padding: "10px 16px 30px", display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-900)", textAlign: "center" }}>Statistics</span>
              <SegmentedControl value="income" onChange={() => {}} options={[{ value: "income", label: "Income" }, { value: "expenses", label: "Expenses" }]} />
              <BarChart height={120} data={[{ label: "Mar", value: 40 }, { label: "Apr", value: 92 }, { label: "May", value: 55 }, { label: "Jun", value: 80 }, { label: "July", value: 48 }, { label: "Aug", value: 66 }]} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-900)" }}>Transaction History</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <TransactionRow style={{ padding: "8px 10px" }} avatar={<Avatar name="Net Flix" size={30} />} title="Netflix" meta="22 Jun at 11:20 pm" amount="-$15.99" />
                <TransactionRow style={{ padding: "8px 10px" }} avatar={<Avatar name="Dri bbble" size={30} />} title="Dribbble" meta="04 Jun at 11:00 am" amount="-$12.99" />
              </div>
            </div>
          </PhoneFrame>
          <div style={{ position: "absolute", left: 60, top: 150, width: 320 }}>
            <Card elevation="md" pad="none" radius="md" style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10 }}>
              <TransactionRow style={{ padding: "10px 12px" }} icon="hand-coins" title="Bank Deposit" amount="+288.00" direction="in" />
              <TransactionRow style={{ padding: "10px 12px" }} avatar={<Avatar name="David A" size={38} />} title="David" meta="Payment received" amount="+300.00" direction="in" />
            </Card>
          </div>
          <div style={{ position: "absolute", right: 60, top: 120, width: 300 }}>
            <Card elevation="md" pad="sm" radius="lg" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <AmountField label="Amount to send" value="100" currency={ccy} onCurrencyChange={() => setCcy(ccy === "USD" ? "EUR" : "USD")} style={{ background: "var(--white)", border: "1px solid var(--border-subtle)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[["Fee", "$0.00"], ["Rate", "107.50"], ["Total", "$100.00"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)" }}><span>{k}</span><span style={{ fontWeight: 600, color: "var(--ink-900)" }}>{v}</span></div>
                ))}
              </div>
              <AmountField label="Recipient will get" value="10,750" currency="BDT" readOnly style={{ background: "var(--cream-100)" }} />
              <Button variant="accent" fullWidth>Continue</Button>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { BordersSection });
