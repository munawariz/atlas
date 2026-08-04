const { SectionHeading, Accordion, BankCard, Card, TransactionRow, Avatar } = window.AtlasDesignSystem_92c2f4;

function StepsSection() {
  return (
    <section id="steps" style={{ background: "var(--forest-800)", padding: "104px 48px 112px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 120, top: 240, width: 360, height: 360, background: "var(--glow-lime)", opacity: 0.5, pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: "var(--page-max)", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 400px", gap: 80, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
          <SectionHeading tone="inverse" size="display-2" title={<>Save When You Send<br />Worldwide</>} body="Use your Atlas debit card to earn automatic cash back rewards at select retailers, including grocery stores, apparel shops, restaurants and more." />
          <Accordion
            items={[
              { title: "Register for free.", body: "Save time with automated reporting. From transactions to disputes and fees or pricing." },
              { title: "Choose an amount to send.", body: "We show the fee, the rate and the total before you commit to anything." },
              { title: "Add recipient's bank details.", body: "Save a recipient once and they appear in your quick-send list next time." },
              { title: "Verify your identity.", body: "A one-time check with your passport or ID keeps the account secure." },
              { title: "Pay for your transfer.", body: "Pay by card or balance. Most transfers land the same day." },
            ]}
          />
        </div>
        <div style={{ position: "relative", paddingTop: 30 }}>
          <div style={{ position: "absolute", left: -20, top: 120, width: 300, height: 300, background: "var(--cream-100)", borderRadius: "var(--radius-2xl)" }} />
          <div style={{ position: "relative" }}>
            <BankCard width={300} finish="sage" network="VISA" />
            <Card elevation="md" pad="sm" radius="md" style={{ marginTop: -20, marginLeft: 16, width: 268, display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-900)" }}>Transaction History</span>
              <TransactionRow style={{ padding: "8px 0" }} avatar={<Avatar name="Net Flix" size={30} />} title="Netflix" meta="22 Jun at 11:20 pm" amount="-$15.99" />
              <TransactionRow style={{ padding: "8px 0" }} avatar={<Avatar name="Dri bbble" size={30} />} title="Dribbble" meta="04 Jun at 11:00 am" amount="-$60.00" />
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { StepsSection });
