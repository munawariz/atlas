const { Marquee, Button, PhoneFrame, QuickActions, BankCard, TransactionRow, Avatar, Icon, Logo } = window.AtlasDesignSystem_92c2f4;

function AppPeek() {
  return (
    <PhoneFrame width={280} bezel="sage">
      <div style={{ background: "var(--cream-100)", padding: "10px 16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Icon name="menu" size={20} color="var(--ink-900)" />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="bell" size={19} color="var(--ink-900)" />
            <Avatar name="Anderson Darrel" size={30} />
          </div>
        </div>
        <BankCard width={248} />
        <QuickActions />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-900)" }}>Recent Activity</span>
          <Icon name="ellipsis" size={18} color="var(--ink-500)" />
        </div>
        <TransactionRow style={{ padding: "10px 12px" }} avatar={<Avatar name="David Anderson" size={36} />} title="David Anderson" meta="30 Jun · Payment received" amount="+$250.00" direction="in" />
      </div>
    </PhoneFrame>
  );
}

function DownloadSection() {
  return (
    <section id="download" style={{ padding: "0 48px 96px" }}>
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", background: "var(--forest-800)", borderRadius: "var(--radius-2xl)", overflow: "hidden" }}>
        <Marquee size={34} items={["Digital Banking", "Cash Back", "Instant Debit"]} style={{ borderBottom: "1px solid var(--border-inverse)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 48, padding: "56px 56px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 30, paddingBottom: 56 }}>
            <div style={{ width: 108, height: 108, background: "var(--white)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center", padding: 12 }}>
              <Icon name="qr-code" size={34} color="var(--forest-800)" />
              <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.3, color: "var(--ink-700)" }}>Scan to install</span>
            </div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "var(--text-display-2)", fontWeight: 700, lineHeight: "var(--leading-display)", letterSpacing: "var(--tracking-display)", color: "var(--white)" }}>
              Download Our<br />Atlas App
            </h2>
            <div style={{ display: "flex", gap: 14 }}>
              <Button variant="outline-inverse" size="lg" icon="smartphone" iconPosition="left">Google Play</Button>
              <Button variant="outline-inverse" size="lg" icon="apple" iconPosition="left">App Store</Button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 26 }}>
              <a href="mailto:hello@atlas.net" style={{ color: "var(--white)", fontSize: "var(--text-body-lg)", textDecoration: "none" }}>hello@atlas.net</a>
              <div style={{ display: "flex", gap: 12 }}>
                {["twitter", "instagram", "linkedin", "facebook"].map((s, i) => (
                  <span key={s} style={{ width: 40, height: 40, borderRadius: "var(--radius-full)", border: "1px solid " + (i === 0 ? "var(--lime-500)" : "var(--border-inverse)"), display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={s} size={17} color={i === 0 ? "var(--lime-500)" : "var(--white)"} />
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: -40 }}>
            <AppPeek />
            <div style={{ marginBottom: 60, transform: "rotate(6deg)" }}><BankCard width={230} finish="cream" /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { DownloadSection, AppPeek });
