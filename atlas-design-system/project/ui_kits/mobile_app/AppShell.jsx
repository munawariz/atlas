const { Icon, Avatar, Logo } = window.AtlasDesignSystem_92c2f4;

const TABS = [
  { id: "home", icon: "house", label: "Home" },
  { id: "stats", icon: "line-chart", label: "Stats" },
  { id: "send", icon: "arrow-up-down", label: "Send" },
  { id: "cards", icon: "credit-card", label: "Cards" },
];

function AppHeader({ title, onMenu, showAvatar = true, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px 14px" }}>
      {onBack ? (
        <button type="button" onClick={onBack} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex" }}>
          <Icon name="chevron-left" size={22} color="var(--ink-900)" />
        </button>
      ) : (
        <button type="button" onClick={onMenu} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex" }}>
          <Icon name="menu" size={22} color="var(--ink-900)" />
        </button>
      )}
      {title && <span style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-900)" }}>{title}</span>}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ position: "relative", display: "flex" }}>
          <Icon name="bell" size={21} color="var(--ink-900)" />
          <span style={{ position: "absolute", top: -1, right: -1, width: 8, height: 8, borderRadius: "50%", background: "var(--negative-500)", border: "1.5px solid var(--white)" }} />
        </span>
        {showAvatar && <Avatar name="Anderson Darrel" size={32} />}
      </div>
    </div>
  );
}

function TabBar({ active, onChange }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "12px 12px 22px", background: "var(--white)", borderTop: "1px solid var(--border-subtle)" }}>
      {TABS.map((t) => {
        const on = t.id === active;
        return (
          <button key={t.id} type="button" onClick={() => onChange(t.id)} style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "2px 10px" }}>
            <Icon name={t.icon} size={22} color={on ? "var(--forest-800)" : "var(--ink-300)"} />
            <span style={{ fontSize: 11, fontWeight: 600, color: on ? "var(--forest-800)" : "var(--ink-500)" }}>{t.label}</span>
            <span style={{ width: 18, height: 3, borderRadius: 3, background: on ? "var(--lime-500)" : "transparent" }} />
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { AppHeader, TabBar, ATLAS_TABS: TABS });
