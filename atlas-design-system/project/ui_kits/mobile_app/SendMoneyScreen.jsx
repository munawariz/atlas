const { AmountField, Button, Card, Avatar, Icon, Badge } = window.AtlasDesignSystem_92c2f4;

const RATE = 107.5;
const RECIPIENTS = [
  { name: "Anisur Rahman", meta: "BRAC Bank · BDT" },
  { name: "Ana Ruiz", meta: "Santander · EUR" },
  { name: "David Anderson", meta: "Monzo · GBP" },
];

function SendMoneyScreen({ onDone }) {
  const [amount, setAmount] = React.useState("100");
  const [who, setWho] = React.useState(0);
  const [sent, setSent] = React.useState(false);
  const num = parseFloat(String(amount).replace(/,/g, "")) || 0;
  const out = (num * RATE).toLocaleString("en-US", { maximumFractionDigits: 0 });

  if (sent) {
    return (
      <div style={{ flex: 1, background: "var(--cream-100)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 32, textAlign: "center" }}>
        <span style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--lime-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={36} color="var(--forest-800)" />
        </span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-900)" }}>Transfer on its way</span>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text-body)", maxWidth: 260 }}>
          {RECIPIENTS[who].name} gets {out} BDT. Most transfers land the same day.
        </p>
        <Button variant="outline" onClick={() => { setSent(false); onDone && onDone(); }}>Back to wallet</Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "0 20px 24px", background: "var(--cream-100)", flex: 1, overflowY: "auto" }}>
      <Card tone="white" pad="sm" radius="lg" elevation="sm" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <AmountField label="Amount to send" value={amount} onChange={(e) => setAmount(e.target.value)} currency="USD" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[["Fee", "$0.00"], ["Rate", RATE.toFixed(2)], ["Total to pay", "$" + num.toFixed(2)]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)" }}>
              <span>{k}</span><span style={{ fontWeight: 600, color: "var(--ink-900)" }}>{v}</span>
            </div>
          ))}
        </div>
        <AmountField label="Recipient will get" value={out} currency="BDT" readOnly style={{ background: "var(--cream-100)" }} />
        <Badge tone="soft" icon="zap">Arrives today</Badge>
      </Card>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-900)" }}>Send to</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {RECIPIENTS.map((r, i) => (
          <button key={r.name} type="button" onClick={() => setWho(i)}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--white)", border: "1px solid " + (who === i ? "var(--forest-800)" : "transparent"), borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "left" }}>
            <Avatar name={r.name} size={44} />
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-900)" }}>{r.name}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{r.meta}</span>
            </span>
            {who === i && <Icon name="check" size={18} color="var(--forest-800)" />}
          </button>
        ))}
      </div>
      <Button variant="accent" fullWidth size="lg" onClick={() => setSent(true)}>Continue</Button>
    </div>
  );
}

Object.assign(window, { SendMoneyScreen });
