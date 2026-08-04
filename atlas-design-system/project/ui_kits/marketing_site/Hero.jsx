const { Button, Logo, Sparkle, BankCard, AvatarStack, StatBlock, IconButton, Icon } = window.AtlasDesignSystem_92c2f4;

function FannedCards() {
  return (
    <div style={{ position: "relative", width: 470, height: 430 }}>
      <div style={{ position: "absolute", inset: "12% 6% 0 8%", background: "var(--cream-100)", borderRadius: "50% 50% 46% 46%" }} />
      <div style={{ position: "absolute", left: 6, top: 176, transform: "rotate(-38deg)" }}><BankCard width={230} finish="cream" holder="Anderson Darrel" /></div>
      <div style={{ position: "absolute", left: 62, top: 96, transform: "rotate(-20deg)" }}><BankCard width={240} finish="sage" holder="Anderson Darrel" /></div>
      <div style={{ position: "absolute", left: 150, top: 34, transform: "rotate(-7deg)" }}><BankCard width={268} finish="forest" holder="Anderson Darrel" /></div>
      <div style={{ position: "absolute", right: -14, bottom: 8 }}>
        <IconButton icon="play" tone="sage" size="xl" label="Watch the film" />
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section id="hero" style={{ position: "relative", overflow: "hidden", padding: "40px 48px 96px" }}>
      <div style={{ position: "absolute", left: -180, top: 60, width: 420, height: 420, background: "var(--glow-lime)", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: "var(--page-max)", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr auto 210px", gap: 40, alignItems: "start" }}>
        <div style={{ paddingTop: 44, maxWidth: 470 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "var(--text-display-1)", fontWeight: 700, lineHeight: "var(--leading-display)", letterSpacing: "var(--tracking-display)", color: "var(--ink-900)" }}>
            Digital Banking<br />Made For{" "}
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 92, height: 52, border: "2px solid var(--lime-500)", borderRadius: "var(--radius-full)", verticalAlign: "middle" }}>
              <Sparkle size={26} />
            </span><br />Digital Users
          </h1>
          <p style={{ marginTop: 26, marginBottom: 34, maxWidth: 380, fontSize: "var(--text-body-md)", lineHeight: "var(--leading-body)", color: "var(--text-body)" }}>
            Atlas is an all-in-one mobile banking app chock full of all the tools, tips, and tricks you need to take control of your finances.
          </p>
          <Button size="lg" onClick={() => window.atlasGoTo("download")}>Send Money Now</Button>
          <div style={{ marginTop: 86, display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-heading-4)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-900)" }}>
              Over 5,000+ <span style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>Reviews</span>
            </span>
            <AvatarStack people={[{ name: "Ana Ruiz" }, { name: "Kim Lee" }, { name: "Sam Ojo" }, { name: "Eve Diaz" }]} overflowLabel="5k+" />
          </div>
        </div>
        <FannedCards />
        <div style={{ paddingTop: 44, display: "flex", flexDirection: "column", gap: 32 }}>
          <span style={{ width: 52, height: 52, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="grid-2x2" size={24} color="var(--forest-800)" />
          </span>
          <span style={{ fontSize: "var(--text-eyebrow)", fontWeight: 600, letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--ink-500)" }}>Atlas in numbers</span>
          <StatBlock value="7.5M" label="Total daily transactions" />
          <StatBlock value="2.4%" label="Average saving per transfer" />
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Hero, FannedCards });
