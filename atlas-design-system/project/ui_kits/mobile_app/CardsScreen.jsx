const { BankCard, Switch, Card, Icon, Badge, Avatar } = window.AtlasDesignSystem_92c2f4;

const CARDS = [
  { finish: "forest", label: "Atlas Debit", network: "VISA", number: "4083 3245 5467 1078" },
  { finish: "sage", label: "Atlas Everyday", network: "Mastercard", number: "5312 8890 4471 2201" },
  { finish: "cream", label: "Atlas Credit", network: "Mastercard", number: "5100 6612 0034 9987" },
];

function CardsScreen() {
  const [i, setI] = React.useState(0);
  const [frozen, setFrozen] = React.useState(false);
  const [online, setOnline] = React.useState(true);
  const card = CARDS[i];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "0 20px 24px", background: "var(--cream-100)", flex: 1, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "center", opacity: frozen ? 0.5 : 1, transition: "opacity var(--duration-base) var(--ease-standard)" }}>
        <BankCard width={330} finish={card.finish} network={card.network} avatar={<Avatar name="Anderson Darrel" size={26} />} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        {CARDS.map((c, n) => (
          <button key={c.label} type="button" onClick={() => setI(n)} aria-label={c.label}
            style={{ width: n === i ? 26 : 8, height: 8, borderRadius: 999, border: "none", background: n === i ? "var(--forest-800)" : "var(--sage-300)", cursor: "pointer", transition: "var(--transition-control)" }} />
        ))}
      </div>
      <Card tone="white" pad="sm" radius="lg" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-900)" }}>{card.label}</span>
          <Badge tone={frozen ? "negative" : "positive"}>{frozen ? "Frozen" : "Active"}</Badge>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, letterSpacing: ".06em", color: "var(--ink-900)" }}>{card.number}</span>
          <Icon name="copy" size={17} color="var(--ink-500)" />
        </div>
        <div style={{ display: "flex", gap: 28 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-500)", fontWeight: 600 }}>Expires</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--ink-900)" }}>08/26</span>
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-500)", fontWeight: 600 }}>CVV</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--ink-900)" }}>•••</span>
          </span>
        </div>
      </Card>
      <Card tone="white" pad="sm" radius="lg" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Switch checked={frozen} onChange={setFrozen} label="Freeze this card" />
        <Switch checked={online} onChange={setOnline} label="Allow online payments" />
      </Card>
    </div>
  );
}

Object.assign(window, { CardsScreen });
