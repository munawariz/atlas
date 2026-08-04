const { SectionHeading, StatBlock, BankCard, Sparkle, Icon, Avatar } = window.AtlasDesignSystem_92c2f4;

function FasterSection() {
  return (
    <section id="faster" style={{ padding: "112px 48px 104px" }}>
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "var(--text-display-2)", fontWeight: 700, lineHeight: "var(--leading-display)", letterSpacing: "var(--tracking-display)", color: "var(--ink-900)" }}>
            Make Your<br />
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 78, height: 46, border: "2px solid var(--lime-500)", borderRadius: "var(--radius-full)", verticalAlign: "middle", marginRight: 12 }}>
              <Icon name="globe" size={26} color="var(--forest-800)" />
            </span>
            Money Move<br />Faster
          </h2>
          <div style={{ display: "flex", gap: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 46, height: 46, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="credit-card" size={20} color="var(--forest-800)" /></span>
              <StatBlock size="sm" value="7.5m+" label="Daily transactions" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 46, height: 46, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkle size={20} color="var(--forest-800)" /></span>
              <StatBlock size="sm" value="+2%" label="Unlimited daily cashback" />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <p style={{ margin: 0, maxWidth: 420, marginLeft: "auto", fontSize: "var(--text-body-sm)", lineHeight: 1.7, color: "var(--text-body)" }}>
            Our dream is for people to live and work anywhere seamlessly. That means money without borders: moving it instantly, transparently, conveniently, and — eventually — for free.
          </p>
          <div style={{ marginLeft: "auto" }}>
            <BankCard width={400} finish="cream" network="Mastercard" avatar={<Avatar name="Anderson Darrel" size={26} />} />
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { FasterSection });
