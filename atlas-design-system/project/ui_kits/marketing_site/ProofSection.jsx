const { SectionHeading, TestimonialCard, StarRating } = window.AtlasDesignSystem_92c2f4;

const PARTNERS = ["Coinbase", "Spotify", "Slack", "Dropbox", "Asana", "InVision"];

function ProofSection() {
  return (
    <section id="proof" style={{ padding: "0 48px 112px" }}>
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", display: "flex", flexDirection: "column", gap: 40 }}>
        <SectionHeading eyebrow="Atlas customer reviews" size="display-2" title={<>Trusted By Over Our<br />400k Accounts</>} action={<StarRating score="4.8" caption="Score on App Store" />} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <TestimonialCard quote="Awesome card and app! I am very impressed with Atlas so far — it lets me send funds abroad at zero cost. It's cheaper than Western Union!" author="Dan Wright" />
          <TestimonialCard tone="sage" quote="I moved my salary across two countries in a week and never once wondered where the money was. The rate I saw was the rate I got." author="Priya Raman" />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, paddingTop: 16, borderTop: "1px solid var(--border-subtle)", marginTop: 8 }}>
          {PARTNERS.map((p) => (
            <span key={p} title="Partner logo not supplied with the brand reference" style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink-300)" }}>{p}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { ProofSection });
