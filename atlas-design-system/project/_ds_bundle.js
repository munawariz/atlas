/* @ds-bundle: {"format":4,"namespace":"AtlasDesignSystem_92c2f4","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"ICON_NAMES","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Logo","sourcePath":"components/core/Logo.jsx"},{"name":"Sparkle","sourcePath":"components/core/Sparkle.jsx"},{"name":"Avatar","sourcePath":"components/data/Avatar.jsx"},{"name":"AvatarStack","sourcePath":"components/data/AvatarStack.jsx"},{"name":"BankCard","sourcePath":"components/data/BankCard.jsx"},{"name":"BarChart","sourcePath":"components/data/BarChart.jsx"},{"name":"SegmentedControl","sourcePath":"components/data/SegmentedControl.jsx"},{"name":"StarRating","sourcePath":"components/data/StarRating.jsx"},{"name":"TransactionRow","sourcePath":"components/data/TransactionRow.jsx"},{"name":"AmountField","sourcePath":"components/forms/AmountField.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Card","sourcePath":"components/layout/Card.jsx"},{"name":"FeatureTile","sourcePath":"components/layout/FeatureTile.jsx"},{"name":"Marquee","sourcePath":"components/layout/Marquee.jsx"},{"name":"PhoneFrame","sourcePath":"components/layout/PhoneFrame.jsx"},{"name":"SectionHeading","sourcePath":"components/layout/SectionHeading.jsx"},{"name":"StatBlock","sourcePath":"components/layout/StatBlock.jsx"},{"name":"TestimonialCard","sourcePath":"components/layout/TestimonialCard.jsx"},{"name":"Accordion","sourcePath":"components/navigation/Accordion.jsx"},{"name":"Navbar","sourcePath":"components/navigation/Navbar.jsx"},{"name":"QuickActions","sourcePath":"components/navigation/QuickActions.jsx"},{"name":"SiteFooter","sourcePath":"components/navigation/SiteFooter.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"b2e766e08253","components/core/Button.jsx":"620956f05669","components/core/Chip.jsx":"25c1d7b92c06","components/core/Icon.jsx":"e29ae6b1481b","components/core/IconButton.jsx":"5d51d2df6942","components/core/Logo.jsx":"f56754306fd2","components/core/Sparkle.jsx":"ab4b7487f7f2","components/data/Avatar.jsx":"c74019f516bc","components/data/AvatarStack.jsx":"ff285fafbbef","components/data/BankCard.jsx":"bdcfaeffe71f","components/data/BarChart.jsx":"845cc30b3e52","components/data/SegmentedControl.jsx":"9207d66c130e","components/data/StarRating.jsx":"e553b21e1f78","components/data/TransactionRow.jsx":"8e72dbe95951","components/forms/AmountField.jsx":"b1aa76a2327a","components/forms/Checkbox.jsx":"0e844b3557da","components/forms/Field.jsx":"7e63667f8933","components/forms/Input.jsx":"61065b95f4dc","components/forms/Radio.jsx":"27e9466d72b7","components/forms/Select.jsx":"6a3b63197239","components/forms/Switch.jsx":"101590792536","components/layout/Card.jsx":"570f365334d4","components/layout/FeatureTile.jsx":"95a6a8fd9189","components/layout/Marquee.jsx":"63ce41abc1d5","components/layout/PhoneFrame.jsx":"3ea0a3b5738d","components/layout/SectionHeading.jsx":"a701e8dcf649","components/layout/StatBlock.jsx":"ec831727f607","components/layout/TestimonialCard.jsx":"389ad494b79b","components/navigation/Accordion.jsx":"64d1de87c27b","components/navigation/Navbar.jsx":"03fd509520cf","components/navigation/QuickActions.jsx":"044c9def5aa1","components/navigation/SiteFooter.jsx":"49c1617c2363","ui_kits/marketing_site/BordersSection.jsx":"e5534ba2c1d3","ui_kits/marketing_site/DownloadSection.jsx":"e53f451698d0","ui_kits/marketing_site/FasterSection.jsx":"884cd39b3aba","ui_kits/marketing_site/FeaturesSection.jsx":"f4cffd65ab8d","ui_kits/marketing_site/Hero.jsx":"090156906e7d","ui_kits/marketing_site/ProofSection.jsx":"09d59a0bb62e","ui_kits/marketing_site/StepsSection.jsx":"2bafe40ed6d4","ui_kits/mobile_app/AppShell.jsx":"65bed3f51f18","ui_kits/mobile_app/CardsScreen.jsx":"f6d093f7cb1e","ui_kits/mobile_app/HomeScreen.jsx":"ce55b0bf40e3","ui_kits/mobile_app/SendMoneyScreen.jsx":"3e100839d0fd","ui_kits/mobile_app/StatisticsScreen.jsx":"6a3caebde9f8","ui_kits/mobile_app/TransactionsScreen.jsx":"8d20a33dcdd5"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AtlasDesignSystem_92c2f4 = window.AtlasDesignSystem_92c2f4 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Chip({
  children,
  selected = false,
  onSelect,
  tone = "light",
  style,
  ...rest
}) {
  const inverse = tone === "inverse";
  const [hover, setHover] = React.useState(false);
  const base = selected ? inverse ? {
    background: "var(--lime-500)",
    color: "var(--forest-800)",
    borderColor: "var(--lime-500)"
  } : {
    background: "var(--forest-800)",
    color: "var(--white)",
    borderColor: "var(--forest-800)"
  } : inverse ? {
    background: "transparent",
    color: "var(--white)",
    borderColor: "var(--border-inverse)"
  } : {
    background: "var(--white)",
    color: "var(--ink-700)",
    borderColor: "var(--border-default)"
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-pressed": selected,
    onClick: onSelect,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      height: 38,
      padding: "0 18px",
      borderRadius: "var(--radius-full)",
      borderStyle: "solid",
      borderWidth: 1,
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-sm)",
      fontWeight: selected ? "var(--weight-semibold)" : "var(--weight-medium)",
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "var(--transition-control)",
      ...base,
      ...(hover && !selected ? {
        borderColor: "var(--forest-800)",
        color: "var(--forest-800)"
      } : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Atlas icon set — Lucide (ISC), vendored. The canonical SVG files live in
   assets/icons/; this map is generated from them so icons render inline with no
   network request, which keeps them intact in screenshot and PDF export.
   To swap in a real Atlas icon library, replace the files in assets/icons/ and
   regenerate this map, or pass `svg` per call. */
const ICONS = {
  "apple": '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"></path><path d="M10 2c1 .5 2 2 2 5"></path>',
  "arrow-down-left": '<path d="M17 7 7 17"></path><path d="M17 17H7V7"></path>',
  "arrow-up-down": '<path d="m21 16-4 4-4-4"></path><path d="M17 20V4"></path><path d="m3 8 4-4 4 4"></path><path d="M7 4v16"></path>',
  "arrow-up-right": '<path d="M7 7h10v10"></path><path d="M7 17 17 7"></path>',
  "bell": '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>',
  "chart-line": '<path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="m19 9-5 5-4-4-3 3"></path>',
  "check": '<path d="M20 6 9 17l-5-5"></path>',
  "chevron-down": '<path d="m6 9 6 6 6-6"></path>',
  "chevron-left": '<path d="m15 18-6-6 6-6"></path>',
  "chevron-right": '<path d="m9 18 6-6-6-6"></path>',
  "chevron-up": '<path d="m18 15-6-6-6 6"></path>',
  "circle": '<circle cx="12" cy="12" r="10"></circle>',
  "copy": '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>',
  "credit-card": '<rect width="20" height="14" x="2" y="5" rx="2"></rect><line x1="2" x2="22" y1="10" y2="10"></line>',
  "cup-soda": '<path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"></path><path d="M5 8h14"></path><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"></path><path d="m12 8 1-6h2"></path>',
  "dribbble": '<circle cx="12" cy="12" r="10"></circle><path d="M19.13 5.09C15.22 9.14 10 10.44 2.25 10.94"></path><path d="M21.75 12.84c-6.62-1.41-12.14 1-16.38 6.32"></path><path d="M8.56 2.75c4.37 6 6 9.42 8 17.72"></path>',
  "ellipsis": '<circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle>',
  "facebook": '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>',
  "file-text": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path>',
  "gift": '<rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M12 8v13"></path><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"></path>',
  "globe": '<circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path>',
  "grid-2x2": '<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 12h18"></path><path d="M12 3v18"></path>',
  "hand-coins": '<path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"></path><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"></path><path d="m2 16 6 6"></path><circle cx="16" cy="9" r="2.9"></circle><circle cx="6" cy="5" r="3"></circle>',
  "house": '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>',
  "instagram": '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>',
  "line-chart": '<path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="m19 9-5 5-4-4-3 3"></path>',
  "linkedin": '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect width="4" height="12" x="2" y="9"></rect><circle cx="4" cy="4" r="2"></circle>',
  "menu": '<line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line>',
  "monitor-play": '<path d="M10 7.75a.75.75 0 0 1 1.142-.638l3.664 2.249a.75.75 0 0 1 0 1.278l-3.664 2.25a.75.75 0 0 1-1.142-.64z"></path><path d="M12 17v4"></path><path d="M8 21h8"></path><rect x="2" y="3" width="20" height="14" rx="2"></rect>',
  "play": '<polygon points="6 3 20 12 6 21 6 3"></polygon>',
  "qr-code": '<rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path>',
  "search": '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>',
  "shopping-bag": '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path>',
  "shopping-cart": '<circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>',
  "sliders-horizontal": '<line x1="21" x2="14" y1="4" y2="4"></line><line x1="10" x2="3" y1="4" y2="4"></line><line x1="21" x2="12" y1="12" y2="12"></line><line x1="8" x2="3" y1="12" y2="12"></line><line x1="21" x2="16" y1="20" y2="20"></line><line x1="12" x2="3" y1="20" y2="20"></line><line x1="14" x2="14" y1="2" y2="6"></line><line x1="8" x2="8" y1="10" y2="14"></line><line x1="16" x2="16" y1="18" y2="22"></line>',
  "smartphone": '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect><path d="M12 18h.01"></path>',
  "star": '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>',
  "train-front": '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"></path><path d="m9 15-1-1"></path><path d="m15 15 1-1"></path><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"></path><path d="m8 19-2 3"></path><path d="m16 19 2 3"></path>',
  "twitter": '<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>',
  "wallet": '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path>',
  "wifi": '<path d="M12 20h.01"></path><path d="M2 8.82a15 15 0 0 1 20 0"></path><path d="M5 12.859a10 10 0 0 1 14 0"></path><path d="M8.5 16.429a5 5 0 0 1 7 0"></path>',
  "zap": '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>'
};

/* Outline glyph, 2px stroke, round caps. Colour comes from `color` (default currentColor). */
function Icon({
  name = "circle",
  size = 20,
  color = "currentColor",
  label,
  style,
  ...rest
}) {
  const inner = ICONS[name] || ICONS.circle;
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    role: label ? "img" : "presentation",
    "aria-label": label,
    "aria-hidden": label ? undefined : true,
    style: {
      display: "inline-block",
      flex: "0 0 auto",
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: inner
    }
  }, rest));
}
const ICON_NAMES = Object.keys(ICONS);
Object.assign(__ds_scope, { Icon, ICON_NAMES });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  accent: {
    background: "var(--lime-500)",
    color: "var(--forest-800)"
  },
  soft: {
    background: "var(--lime-200)",
    color: "var(--forest-800)"
  },
  forest: {
    background: "var(--forest-800)",
    color: "var(--white)"
  },
  sage: {
    background: "var(--sage-200)",
    color: "var(--forest-800)"
  },
  cream: {
    background: "var(--cream-100)",
    color: "var(--forest-800)"
  },
  positive: {
    background: "var(--positive-100)",
    color: "var(--positive-600)"
  },
  negative: {
    background: "var(--negative-100)",
    color: "var(--negative-600)"
  },
  warning: {
    background: "var(--warning-100)",
    color: "#8a5b12"
  }
};
function Badge({
  children,
  tone = "soft",
  icon,
  uppercase = false,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.soft;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 28,
      padding: "0 12px",
      borderRadius: "var(--radius-full)",
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-label-sm)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: uppercase ? "var(--tracking-eyebrow)" : "var(--tracking-label)",
      textTransform: uppercase ? "uppercase" : "none",
      whiteSpace: "nowrap",
      ...t,
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13,
    color: t.color
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    height: 40,
    padding: "0 18px",
    font: "var(--text-body-sm)",
    icon: 16,
    gap: 8
  },
  md: {
    height: 48,
    padding: "0 26px",
    font: "var(--text-body-md)",
    icon: 18,
    gap: 10
  },
  lg: {
    height: 58,
    padding: "0 34px",
    font: "var(--text-body-md)",
    icon: 20,
    gap: 12
  }
};
const VARIANTS = {
  primary: {
    background: "var(--forest-800)",
    color: "var(--white)",
    border: "1px solid var(--forest-800)"
  },
  accent: {
    background: "var(--lime-500)",
    color: "var(--forest-800)",
    border: "1px solid var(--lime-500)"
  },
  outline: {
    background: "transparent",
    color: "var(--forest-800)",
    border: "1px solid var(--forest-800)"
  },
  ghost: {
    background: "transparent",
    color: "var(--forest-800)",
    border: "1px solid transparent"
  },
  inverse: {
    background: "var(--white)",
    color: "var(--forest-800)",
    border: "1px solid var(--white)"
  },
  "outline-inverse": {
    background: "transparent",
    color: "var(--white)",
    border: "1px solid var(--border-inverse)"
  }
};
const HOVER = {
  primary: "var(--forest-700)",
  accent: "var(--lime-600)",
  outline: "var(--forest-50)",
  ghost: "var(--forest-50)",
  inverse: "var(--cream-100)",
  "outline-inverse": "rgba(255,255,255,.10)"
};
function Button({
  children,
  variant = "primary",
  size = "md",
  shape = "rounded",
  icon,
  iconPosition = "right",
  fullWidth = false,
  disabled = false,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: fullWidth ? "flex" : "inline-flex",
      width: fullWidth ? "100%" : undefined,
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      fontFamily: "var(--font-text)",
      fontSize: s.font,
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-label)",
      borderRadius: shape === "pill" ? "var(--radius-full)" : "var(--radius-button)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1,
      transform: press && !disabled ? "translateY(1px)" : "none",
      transition: "var(--transition-control)",
      ...v,
      background: hover && !disabled ? HOVER[variant] : v.background,
      ...style
    }
  }, rest), icon && iconPosition === "left" && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon
  }), children, icon && iconPosition === "right" && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: 36,
  md: 44,
  lg: 56,
  xl: 72
};
const TONES = {
  forest: {
    background: "var(--forest-800)",
    color: "var(--white)",
    border: "1px solid var(--forest-800)"
  },
  accent: {
    background: "var(--lime-500)",
    color: "var(--forest-800)",
    border: "1px solid var(--lime-500)"
  },
  sage: {
    background: "var(--sage-200)",
    color: "var(--forest-800)",
    border: "1px solid var(--sage-200)"
  },
  white: {
    background: "var(--white)",
    color: "var(--forest-800)",
    border: "1px solid var(--border-subtle)"
  },
  outline: {
    background: "transparent",
    color: "var(--forest-800)",
    border: "1px solid var(--border-default)"
  },
  "outline-inverse": {
    background: "transparent",
    color: "var(--white)",
    border: "1px solid var(--border-inverse)"
  }
};
function IconButton({
  icon = "arrow-up-right",
  tone = "forest",
  size = "md",
  shape = "circle",
  label,
  style,
  ...rest
}) {
  const px = SIZES[size] || SIZES.md;
  const t = TONES[tone] || TONES.forest;
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label || icon,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: px,
      height: px,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: shape === "circle" ? "var(--radius-full)" : "var(--radius-sm)",
      cursor: "pointer",
      transition: "var(--transition-control)",
      filter: hover ? "brightness(0.94)" : "none",
      ...t,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: Math.round(px * 0.42),
    color: t.color
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* No logo file was supplied with the brand reference, so the Atlas mark is the
   wordmark set in the display face. See readme.md > Assets. */
function Logo({
  size = 26,
  tone = "forest",
  style,
  ...rest
}) {
  const color = tone === "inverse" ? "var(--white)" : tone === "accent" ? "var(--lime-500)" : "var(--forest-800)";
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: size,
      letterSpacing: "-0.045em",
      lineHeight: 1,
      color,
      display: "inline-block",
      ...style
    }
  }, rest), "atlas");
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/Sparkle.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* The four-point star is Atlas's one decorative motif: it separates items in the
   marquee band and punctuates hero headlines. Geometric ornament, not a logo. */
function Sparkle({
  size = 20,
  color = "var(--lime-500)",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    "aria-hidden": "true",
    style: {
      display: "block",
      flex: "0 0 auto",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("path", {
    fill: color,
    d: "M12 1c.9 5.9 3.3 8.9 9.5 10-6.2 1.1-8.6 4.1-9.5 10-.9-5.9-3.3-8.9-9.5-10C8.7 9.9 11.1 6.9 12 1Z"
  }));
}
Object.assign(__ds_scope, { Sparkle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Sparkle.jsx", error: String((e && e.message) || e) }); }

// components/data/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Avatar({
  src,
  name = "",
  size = 40,
  ring = "none",
  style,
  ...rest
}) {
  const initials = name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const rings = {
    none: "none",
    white: "0 0 0 3px var(--white)",
    lime: "0 0 0 3px var(--lime-500)",
    forest: "0 0 0 3px var(--forest-800)"
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      width: size,
      height: size,
      flex: "0 0 auto",
      borderRadius: "var(--radius-full)",
      overflow: "hidden",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--sage-200)",
      boxShadow: rings[ring] || "none",
      fontFamily: "var(--font-text)",
      fontSize: size * 0.36,
      fontWeight: "var(--weight-semibold)",
      color: "var(--forest-800)",
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data/AvatarStack.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function AvatarStack({
  people = [],
  size = 46,
  overflowLabel,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      ...style
    }
  }, rest), people.map((p, i) => /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    key: i,
    src: p.src,
    name: p.name,
    size: size,
    ring: "white",
    style: {
      marginLeft: i === 0 ? 0 : -size * 0.28,
      zIndex: people.length - i
    }
  })), overflowLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      marginLeft: -size * 0.28,
      borderRadius: "var(--radius-full)",
      background: "var(--cream-100)",
      boxShadow: "0 0 0 3px var(--white)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-text)",
      fontSize: size * 0.3,
      fontWeight: "var(--weight-semibold)",
      color: "var(--forest-800)"
    }
  }, overflowLabel));
}
Object.assign(__ds_scope, { AvatarStack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/AvatarStack.jsx", error: String((e && e.message) || e) }); }

// components/data/BankCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* The Atlas payment card. Three finishes exist: forest (flagship), sage (secondary),
   cream (credit). The oversized brand shape is a cropped lime/ivory circle pair. */
const FINISH = {
  forest: {
    bg: "var(--forest-800)",
    ink: "var(--white)",
    logo: "inverse",
    shapeA: "var(--lime-500)",
    shapeB: "var(--sage-200)"
  },
  sage: {
    bg: "var(--sage-200)",
    ink: "var(--forest-800)",
    logo: "forest",
    shapeA: "var(--lime-500)",
    shapeB: "var(--forest-800)"
  },
  cream: {
    bg: "var(--cream-100)",
    ink: "var(--forest-800)",
    logo: "forest",
    shapeA: "var(--lime-400)",
    shapeB: "var(--sage-200)"
  }
};
function BankCard({
  finish = "forest",
  holder = "Anderson Darrel",
  network = "VISA",
  width = 340,
  avatar,
  contactless = true,
  chip = true,
  style,
  ...rest
}) {
  const s = width / 340;
  const t = FINISH[finish] || FINISH.forest;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "relative",
      width,
      height: width * 0.63,
      borderRadius: 22 * s,
      background: t.bg,
      overflow: "hidden",
      boxShadow: "var(--shadow-float)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: width * -0.07,
      top: width * 0.15,
      width: width * 0.33,
      height: width * 0.33,
      borderRadius: "50%",
      border: `${width * 0.058}px solid ${t.shapeA}`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      padding: 20 * s,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    size: 20 * s,
    tone: t.logo
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8 * s
    }
  }, chip && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26 * s,
      height: 20 * s,
      borderRadius: 4 * s,
      backgroundImage: "linear-gradient(135deg,#eecf83,#c9a24d)",
      display: "block"
    }
  }), contactless && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "wifi",
    size: 17 * s,
    color: t.ink,
    style: {
      transform: "rotate(90deg)"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8 * s
    }
  }, avatar, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: 12 * s,
      lineHeight: 1.25,
      color: t.ink,
      opacity: 0.85,
      maxWidth: 90 * s
    }
  }, holder)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 19 * s,
      fontWeight: 800,
      fontStyle: "italic",
      letterSpacing: "-0.02em",
      color: t.ink
    }
  }, network))));
}
Object.assign(__ds_scope, { BankCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/BankCard.jsx", error: String((e && e.message) || e) }); }

// components/data/BarChart.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Alternating forest / sage columns with rounded caps — the app's spending chart. */
function BarChart({
  data = [],
  height = 200,
  highlight = "alternate",
  style,
  ...rest
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 14,
      height,
      ...style
    }
  }, rest), data.map((d, i) => {
    const active = highlight === "alternate" ? i % 2 === 1 : d.active;
    return /*#__PURE__*/React.createElement("div", {
      key: d.label + i,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        height: "100%",
        justifyContent: "flex-end"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        height: `${d.value / max * 100}%`,
        background: active ? "var(--forest-800)" : "var(--sage-200)",
        borderRadius: 8,
        transition: "height var(--duration-slow) var(--ease-standard)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-text)",
        fontSize: "var(--text-body-xs)",
        fontWeight: "var(--weight-semibold)",
        color: "var(--text-heading)"
      }
    }, d.label));
  }));
}
Object.assign(__ds_scope, { BarChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/BarChart.jsx", error: String((e && e.message) || e) }); }

// components/data/SegmentedControl.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SegmentedControl({
  options = [],
  value,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      gap: 4,
      padding: 4,
      background: "var(--sage-100)",
      borderRadius: "var(--radius-md)",
      ...style
    }
  }, rest), options.map(o => {
    const key = o.value ?? o;
    const selected = key === value;
    return /*#__PURE__*/React.createElement("button", {
      key: key,
      type: "button",
      onClick: () => onChange && onChange(key),
      style: {
        flex: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 44,
        padding: "0 18px",
        border: "none",
        borderRadius: "var(--radius-sm)",
        background: selected ? "var(--white)" : "transparent",
        boxShadow: selected ? "var(--shadow-xs)" : "none",
        fontFamily: "var(--font-text)",
        fontSize: "var(--text-body-sm)",
        fontWeight: "var(--weight-semibold)",
        color: "var(--text-heading)",
        cursor: "pointer",
        transition: "var(--transition-control)"
      }
    }, o.label ?? o, o.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: o.icon,
      size: 16,
      color: "var(--forest-800)"
    }));
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/data/StarRating.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function StarRating({
  value = 5,
  max = 5,
  size = 18,
  score,
  caption,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      ...style
    }
  }, rest), score && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "var(--text-stat-md)",
      fontWeight: "var(--weight-bold)",
      letterSpacing: "var(--tracking-stat)",
      color: "var(--text-heading)"
    }
  }, score), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 3
    }
  }, Array.from({
    length: max
  }).map((_, i) => /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    key: i,
    name: "star",
    size: size,
    color: i < value ? "var(--forest-800)" : "var(--sage-200)"
  }))), caption && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-xs)",
      color: "var(--text-muted)"
    }
  }, caption)));
}
Object.assign(__ds_scope, { StarRating });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StarRating.jsx", error: String((e && e.message) || e) }); }

// components/data/TransactionRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TransactionRow({
  title,
  meta,
  amount,
  direction = "out",
  icon = "credit-card",
  avatar,
  chipTone = "cream",
  onClick,
  chevron = false,
  style,
  ...rest
}) {
  const tones = {
    cream: "var(--cream-100)",
    sage: "var(--sage-100)",
    lime: "var(--lime-200)"
  };
  const positive = direction === "in";
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 16px",
      background: "var(--white)",
      borderRadius: "var(--radius-md)",
      cursor: onClick ? "pointer" : "default",
      ...style
    }
  }, rest), avatar || /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      flex: "0 0 auto",
      borderRadius: 12,
      background: tones[chipTone] || tones.cream,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20,
    color: "var(--forest-800)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-sm)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-heading)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, title), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-xs)",
      color: "var(--text-muted)"
    }
  }, meta)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-sm)",
      fontWeight: "var(--weight-semibold)",
      color: positive ? "var(--positive-500)" : "var(--text-heading)",
      whiteSpace: "nowrap"
    }
  }, amount), chevron && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 16,
    color: "var(--ink-300)"
  }));
}
Object.assign(__ds_scope, { TransactionRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/TransactionRow.jsx", error: String((e && e.message) || e) }); }

// components/forms/AmountField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Money entry with a currency picker on the trailing edge — the send-money flow's
   primary control. `flag` is any emoji-free node; pass an <img> of a flag asset if you have one. */
function AmountField({
  label,
  value,
  onChange,
  currency = "USD",
  currencies = ["USD", "EUR", "GBP", "BDT"],
  onCurrencyChange,
  flag,
  readOnly = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 16px",
      background: "var(--cream-100)",
      borderRadius: "var(--radius-md)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-xs)",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: onChange,
    readOnly: readOnly,
    inputMode: "decimal",
    style: {
      border: "none",
      outline: "none",
      background: "transparent",
      width: "100%",
      fontFamily: "var(--font-display)",
      fontSize: "var(--text-stat-sm)",
      fontWeight: "var(--weight-bold)",
      letterSpacing: "var(--tracking-stat)",
      color: "var(--text-heading)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      alignSelf: "stretch",
      background: "var(--border-subtle)"
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onCurrencyChange,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-sm)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-heading)"
    }
  }, flag, currency, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 16,
    color: "var(--ink-700)"
  })));
}
Object.assign(__ds_scope, { AmountField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/AmountField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: "flex",
      alignItems: description ? "flex-start" : "center",
      gap: 12,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      flex: "0 0 auto",
      marginTop: description ? 2 : 0,
      borderRadius: 6,
      border: "1px solid " + (checked ? "var(--forest-800)" : "var(--border-default)"),
      background: checked ? "var(--forest-800)" : "var(--white)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "var(--transition-control)"
    }
  }, checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 14,
    color: "var(--lime-500)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-sm)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-heading)"
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-xs)",
      color: "var(--text-muted)",
      lineHeight: 1.5
    }
  }, description)));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Shared label / hint / error frame for every Atlas form control. */
function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      ...style
    }
  }, rest), label && /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-sm)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-heading)",
      letterSpacing: "var(--tracking-label)"
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--negative-500)",
      marginLeft: 4
    }
  }, "*")), children, (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-xs)",
      color: error ? "var(--negative-600)" : "var(--text-muted)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  icon,
  suffix,
  invalid = false,
  disabled = false,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      height: 52,
      padding: "0 16px",
      background: disabled ? "var(--ink-100)" : "var(--white)",
      border: "1px solid " + (invalid ? "var(--negative-500)" : focus ? "var(--forest-800)" : "var(--border-default)"),
      borderRadius: "var(--radius-input)",
      boxShadow: focus ? "var(--shadow-focus)" : "none",
      transition: "var(--transition-control)",
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    color: "var(--ink-500)"
  }), /*#__PURE__*/React.createElement("input", _extends({
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-md)",
      color: "var(--text-heading)"
    }
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-sm)",
      color: "var(--text-muted)"
    }
  }, suffix));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Radio({
  checked = false,
  onChange,
  label,
  value,
  name,
  disabled = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      flex: "0 0 auto",
      borderRadius: "var(--radius-full)",
      border: "1px solid " + (checked ? "var(--forest-800)" : "var(--border-default)"),
      background: "var(--white)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "var(--transition-control)"
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: "var(--radius-full)",
      background: "var(--forest-800)"
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-sm)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-heading)"
    }
  }, label));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  options = [],
  value,
  onChange,
  disabled = false,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      height: 52,
      padding: "0 16px",
      background: disabled ? "var(--ink-100)" : "var(--white)",
      border: "1px solid " + (focus ? "var(--forest-800)" : "var(--border-default)"),
      borderRadius: "var(--radius-input)",
      boxShadow: focus ? "var(--shadow-focus)" : "none",
      transition: "var(--transition-control)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    value: value,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: "none",
      WebkitAppearance: "none",
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-md)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-heading)",
      cursor: disabled ? "not-allowed" : "pointer"
    }
  }, rest), options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value ?? o,
    value: o.value ?? o
  }, o.label ?? o))), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 18,
    color: "var(--ink-700)"
  }));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      width: 48,
      height: 28,
      flex: "0 0 auto",
      borderRadius: "var(--radius-full)",
      background: checked ? "var(--forest-800)" : "var(--sage-200)",
      padding: 3,
      display: "flex",
      justifyContent: checked ? "flex-end" : "flex-start",
      transition: "background-color var(--duration-base) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: "var(--radius-full)",
      background: checked ? "var(--lime-500)" : "var(--white)",
      boxShadow: "var(--shadow-xs)",
      transition: "background-color var(--duration-base) var(--ease-standard)"
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-sm)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-heading)"
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/layout/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  white: {
    background: "var(--white)",
    color: "var(--text-body)"
  },
  cream: {
    background: "var(--cream-100)",
    color: "var(--text-body)"
  },
  sage: {
    background: "var(--sage-100)",
    color: "var(--text-body)"
  },
  forest: {
    background: "var(--forest-800)",
    color: "var(--text-inverse-muted)"
  },
  accent: {
    background: "var(--lime-500)",
    color: "var(--forest-800)"
  }
};
function Card({
  children,
  tone = "white",
  pad = "md",
  radius = "card",
  elevation = "none",
  bordered = false,
  style,
  ...rest
}) {
  const pads = {
    none: 0,
    sm: 20,
    md: 32,
    lg: 40
  };
  const radii = {
    card: "var(--radius-card)",
    lg: "var(--radius-card-lg)",
    md: "var(--radius-md)",
    sm: "var(--radius-sm)"
  };
  const shadows = {
    none: "none",
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)"
  };
  const t = TONES[tone] || TONES.white;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "relative",
      overflow: "hidden",
      padding: pads[pad] ?? pads.md,
      borderRadius: radii[radius] || radii.card,
      boxShadow: shadows[elevation] || "none",
      border: bordered ? "1px solid " + (tone === "forest" ? "var(--border-inverse)" : "var(--border-subtle)") : "none",
      ...t,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Card.jsx", error: String((e && e.message) || e) }); }

// components/layout/FeatureTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Icon chip, title, body — the unit that makes up Atlas's feature grids.
   Tinted ground, flat, and often cropping a screenshot or card at the bottom. */
function FeatureTile({
  icon = "wallet",
  title,
  body,
  tone = "cream",
  pad = 32,
  children,
  action,
  style,
  ...rest
}) {
  const grounds = {
    cream: "var(--cream-100)",
    sage: "var(--sage-100)",
    forest: "var(--forest-800)",
    white: "var(--white)"
  };
  const inverse = tone === "forest";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      gap: 18,
      padding: pad,
      background: grounds[tone] || grounds.cream,
      borderRadius: "var(--radius-card-lg)",
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 54,
      height: 54,
      borderRadius: "var(--radius-full)",
      background: "var(--lime-500)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 26,
    color: "var(--forest-800)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: "var(--text-heading-2)",
      fontWeight: "var(--weight-bold)",
      letterSpacing: "var(--tracking-heading)",
      lineHeight: 1.25,
      color: inverse ? "var(--white)" : "var(--text-heading)",
      maxWidth: "20ch"
    }
  }, title), body && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-body-sm)",
      lineHeight: 1.65,
      color: inverse ? "var(--text-inverse-muted)" : "var(--text-body)"
    }
  }, body)), action, children);
}
Object.assign(__ds_scope, { FeatureTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/FeatureTile.jsx", error: String((e && e.message) || e) }); }

// components/layout/Marquee.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* The forest band of scrolling propositions, separated by lime sparkles.
   Appears two or three times down a marketing page as a rhythm break. */
function Marquee({
  items = [],
  tone = "forest",
  speed = 32,
  size = 30,
  style,
  ...rest
}) {
  const inverse = tone !== "accent";
  const run = items.length ? items : ["Instant Online Debit", "Digital Banking", "Cash Back & Perks"];
  const seq = [...run, ...run, ...run, ...run];
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      overflow: "hidden",
      background: inverse ? "var(--forest-800)" : "var(--lime-500)",
      padding: "22px 0",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      width: "max-content",
      alignItems: "center",
      gap: 44,
      animation: `atlas-marquee ${speed}s linear infinite`
    }
  }, seq.concat(seq).map((item, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: size,
      fontWeight: "var(--weight-medium)",
      letterSpacing: "-0.02em",
      whiteSpace: "nowrap",
      color: inverse ? "var(--white)" : "var(--forest-800)"
    }
  }, item), /*#__PURE__*/React.createElement(__ds_scope.Sparkle, {
    size: size * 0.72,
    color: inverse ? "var(--lime-500)" : "var(--forest-800)"
  })))));
}
Object.assign(__ds_scope, { Marquee });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Marquee.jsx", error: String((e && e.message) || e) }); }

// components/layout/PhoneFrame.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Device shell used everywhere Atlas shows the app inside a marketing layout.
   Forest bezel is the brand default; sage for the lighter feature cards. */
function PhoneFrame({
  children,
  width = 300,
  bezel = "forest",
  statusBar = true,
  time = "12:30",
  style,
  ...rest
}) {
  const scale = width / 300;
  const bezelColor = bezel === "sage" ? "var(--sage-300)" : bezel === "ink" ? "var(--ink-900)" : "var(--forest-800)";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width,
      borderRadius: 44 * scale,
      background: bezelColor,
      padding: 10 * scale,
      boxShadow: "var(--shadow-lg)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--white)",
      borderRadius: 36 * scale,
      overflow: "hidden",
      position: "relative"
    }
  }, statusBar && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: `${12 * scale}px ${18 * scale}px ${4 * scale}px`,
      fontFamily: "var(--font-text)",
      fontSize: 12 * scale,
      fontWeight: "var(--weight-semibold)",
      color: "var(--ink-900)"
    }
  }, /*#__PURE__*/React.createElement("span", null, time), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 4 * scale,
      alignItems: "flex-end"
    }
  }, [5, 7, 9, 11].map(h => /*#__PURE__*/React.createElement("span", {
    key: h,
    style: {
      width: 2.5 * scale,
      height: h * scale,
      background: "var(--ink-900)",
      borderRadius: 1
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22 * scale,
      height: 11 * scale,
      border: `1.5px solid var(--ink-900)`,
      borderRadius: 3 * scale,
      marginLeft: 3 * scale,
      padding: 1.5 * scale
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      width: "80%",
      height: "100%",
      background: "var(--ink-900)",
      borderRadius: 1
    }
  })))), children));
}
Object.assign(__ds_scope, { PhoneFrame });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/PhoneFrame.jsx", error: String((e && e.message) || e) }); }

// components/layout/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SectionHeading({
  eyebrow,
  title,
  body,
  align = "left",
  tone = "light",
  size = "display-3",
  action,
  style,
  ...rest
}) {
  const inverse = tone === "inverse";
  const sizes = {
    "display-2": "var(--text-display-2)",
    "display-3": "var(--text-display-3)",
    "display-4": "var(--text-display-4)"
  };
  const centered = align === "center";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: centered ? "center" : "flex-end",
      justifyContent: "space-between",
      gap: 32,
      flexDirection: centered ? "column" : "row",
      textAlign: centered ? "center" : "left",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      maxWidth: centered ? 720 : 620,
      alignItems: centered ? "center" : "flex-start"
    }
  }, eyebrow && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-eyebrow)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: inverse ? "var(--lime-500)" : "var(--ink-500)"
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: sizes[size] || sizes["display-3"],
      fontWeight: "var(--weight-bold)",
      lineHeight: "var(--leading-display)",
      letterSpacing: "var(--tracking-display)",
      color: inverse ? "var(--white)" : "var(--text-heading)",
      textWrap: "balance"
    }
  }, title), body && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 520,
      fontSize: "var(--text-body-md)",
      lineHeight: "var(--leading-body)",
      color: inverse ? "var(--text-inverse-muted)" : "var(--text-body)"
    }
  }, body)), action);
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/layout/StatBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function StatBlock({
  value,
  label,
  size = "lg",
  tone = "light",
  style,
  ...rest
}) {
  const sizes = {
    lg: "var(--text-stat-lg)",
    md: "var(--text-stat-md)",
    sm: "var(--text-stat-sm)"
  };
  const inverse = tone === "inverse";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: sizes[size] || sizes.lg,
      fontWeight: "var(--weight-bold)",
      letterSpacing: "var(--tracking-stat)",
      lineHeight: 1.1,
      color: inverse ? "var(--white)" : "var(--text-heading)"
    }
  }, value), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-sm)",
      fontWeight: "var(--weight-semibold)",
      color: inverse ? "var(--text-inverse-muted)" : "var(--text-body)"
    }
  }, label));
}
Object.assign(__ds_scope, { StatBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/StatBlock.jsx", error: String((e && e.message) || e) }); }

// components/layout/TestimonialCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TestimonialCard({
  quote,
  author,
  role,
  tone = "cream",
  style,
  ...rest
}) {
  const grounds = {
    cream: "var(--cream-100)",
    sage: "var(--sage-100)",
    white: "var(--white)"
  };
  return /*#__PURE__*/React.createElement("figure", _extends({
    style: {
      margin: 0,
      display: "flex",
      flexDirection: "column",
      gap: 22,
      padding: 36,
      background: grounds[tone] || grounds.cream,
      borderRadius: "var(--radius-card)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 46,
      fontWeight: 800,
      lineHeight: 0.7,
      color: "var(--forest-800)"
    }
  }, "\u201C"), /*#__PURE__*/React.createElement("blockquote", {
    style: {
      margin: 0,
      fontSize: "var(--text-body-md)",
      lineHeight: 1.65,
      color: "var(--text-heading)"
    }
  }, quote), /*#__PURE__*/React.createElement("figcaption", {
    style: {
      fontSize: "var(--text-body-sm)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-heading)"
    }
  }, "\u2014 ", author, role && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: "var(--weight-regular)",
      color: "var(--text-muted)"
    }
  }, ", ", role)));
}
Object.assign(__ds_scope, { TestimonialCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/TestimonialCard.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Accordion.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Numbered disclosure list — Atlas's how-it-works pattern. Forest ground, lime rules. */
function Accordion({
  items = [],
  defaultOpen = 0,
  tone = "inverse",
  numbered = true,
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const inverse = tone === "inverse";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      ...style
    }
  }, rest), items.map((item, i) => {
    const isOpen = i === open;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        borderBottom: "1px solid " + (isOpen ? inverse ? "var(--lime-500)" : "var(--forest-800)" : inverse ? "rgba(255,255,255,.16)" : "var(--border-subtle)"),
        transition: "border-color var(--duration-base) var(--ease-standard)"
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setOpen(isOpen ? -1 : i),
      style: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: "22px 4px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left"
      }
    }, numbered && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-text)",
        fontSize: "var(--text-body-sm)",
        fontWeight: "var(--weight-medium)",
        color: inverse ? "var(--text-inverse-muted)" : "var(--text-muted)",
        minWidth: 26
      }
    }, String(i + 1).padStart(2, "0")), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontFamily: "var(--font-display)",
        fontSize: "var(--text-heading-4)",
        fontWeight: "var(--weight-semibold)",
        letterSpacing: "-0.01em",
        color: inverse ? "var(--white)" : "var(--text-heading)"
      }
    }, item.title), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: isOpen ? "chevron-up" : "chevron-down",
      size: 20,
      color: isOpen ? "var(--lime-500)" : inverse ? "rgba(255,255,255,.55)" : "var(--ink-500)"
    })), isOpen && item.body && /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        padding: numbered ? "0 4px 22px 52px" : "0 4px 22px",
        maxWidth: 560,
        fontSize: "var(--text-body-sm)",
        lineHeight: 1.7,
        color: inverse ? "var(--text-inverse-muted)" : "var(--text-body)"
      }
    }, item.body));
  }));
}
Object.assign(__ds_scope, { Accordion });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Accordion.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Navbar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Navbar({
  links = [],
  activeIndex = -1,
  tone = "light",
  cta = "Open an Account",
  onNavigate,
  onCta,
  style,
  ...rest
}) {
  const inverse = tone === "inverse";
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 40,
      padding: "26px 48px",
      background: inverse ? "var(--forest-800)" : "var(--white)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    size: 26,
    tone: inverse ? "inverse" : "forest"
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 38
    }
  }, links.map((l, i) => /*#__PURE__*/React.createElement("button", {
    key: l,
    type: "button",
    onClick: () => onNavigate && onNavigate(l, i),
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-label-md)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: inverse ? i === activeIndex ? "var(--lime-500)" : "var(--white)" : i === activeIndex ? "var(--forest-800)" : "var(--ink-800)",
      paddingBottom: 3,
      borderBottom: "1.5px solid " + (i === activeIndex ? "var(--lime-500)" : "transparent"),
      transition: "var(--transition-control)"
    }
  }, l))), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: inverse ? "accent" : "outline",
    shape: "pill",
    size: "md",
    onClick: onCta
  }, cta));
}
Object.assign(__ds_scope, { Navbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Navbar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/QuickActions.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* The four-up action row on the app home screen. */
function QuickActions({
  actions = [],
  onSelect,
  style,
  ...rest
}) {
  const list = actions.length ? actions : [{
    icon: "arrow-up-down",
    label: "Transfer"
  }, {
    icon: "hand-coins",
    label: "Request"
  }, {
    icon: "file-text",
    label: "PayBill"
  }, {
    icon: "grid-2x2",
    label: "More"
  }];
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${list.length},1fr)`,
      gap: 12,
      ...style
    }
  }, rest), list.map(a => /*#__PURE__*/React.createElement("button", {
    key: a.label,
    type: "button",
    onClick: () => onSelect && onSelect(a.label),
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      border: "none",
      background: "transparent",
      cursor: "pointer",
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: "100%",
      aspectRatio: "1 / 1",
      maxWidth: 58,
      borderRadius: "var(--radius-md)",
      background: "var(--white)",
      boxShadow: "var(--shadow-sm)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: a.icon,
    size: 22,
    color: "var(--forest-800)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body-xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-heading)"
    }
  }, a.label))));
}
Object.assign(__ds_scope, { QuickActions });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/QuickActions.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SiteFooter.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SiteFooter({
  email = "hello@atlas.net",
  columns = [],
  social = ["twitter", "instagram", "linkedin", "facebook"],
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("footer", _extends({
    style: {
      background: "var(--forest-800)",
      color: "var(--text-inverse-muted)",
      padding: "72px 48px 56px",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      display: "flex",
      gap: 64,
      flexWrap: "wrap",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24,
      maxWidth: 300
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    size: 30,
    tone: "inverse"
  }), /*#__PURE__*/React.createElement("a", {
    href: "mailto:" + email,
    style: {
      color: "var(--white)",
      fontSize: "var(--text-body-md)",
      textDecoration: "none"
    }
  }, email), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, social.map((s, i) => /*#__PURE__*/React.createElement("span", {
    key: s,
    style: {
      width: 40,
      height: 40,
      borderRadius: "var(--radius-full)",
      border: "1px solid " + (i === 0 ? "var(--lime-500)" : "var(--border-inverse)"),
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: s,
    size: 17,
    color: i === 0 ? "var(--lime-500)" : "var(--white)"
  }))))), columns.map(col => /*#__PURE__*/React.createElement("div", {
    key: col.title,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-eyebrow)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--lime-500)"
    }
  }, col.title), col.links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      color: "var(--text-inverse-muted)",
      fontSize: "var(--text-body-sm)",
      textDecoration: "none"
    }
  }, l))))));
}
Object.assign(__ds_scope, { SiteFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SiteFooter.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/BordersSection.jsx
try { (() => {
const {
  SectionHeading,
  Button,
  PhoneFrame,
  Card,
  IconButton,
  AmountField,
  TransactionRow,
  Avatar,
  SegmentedControl,
  BarChart
} = window.AtlasDesignSystem_92c2f4;
function BordersSection() {
  const [ccy, setCcy] = React.useState("USD");
  return /*#__PURE__*/React.createElement("section", {
    id: "borders",
    style: {
      padding: "0 48px 120px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: 40
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    size: "display-2",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Meet Money Without", /*#__PURE__*/React.createElement("br", null), "Borders"),
    action: /*#__PURE__*/React.createElement(Button, null, "Send Money Now")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      background: "var(--cream-100)",
      borderRadius: "var(--radius-2xl)",
      padding: "48px 56px",
      minHeight: 420,
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 40,
      top: -30
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-up-right",
    tone: "accent",
    size: "xl",
    label: "Start a transfer"
  })), /*#__PURE__*/React.createElement(PhoneFrame, {
    width: 300,
    bezel: "ink"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 16px 30px",
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 17,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "var(--ink-900)",
      textAlign: "center"
    }
  }, "Statistics"), /*#__PURE__*/React.createElement(SegmentedControl, {
    value: "income",
    onChange: () => {},
    options: [{
      value: "income",
      label: "Income"
    }, {
      value: "expenses",
      label: "Expenses"
    }]
  }), /*#__PURE__*/React.createElement(BarChart, {
    height: 120,
    data: [{
      label: "Mar",
      value: 40
    }, {
      label: "Apr",
      value: 92
    }, {
      label: "May",
      value: 55
    }, {
      label: "Jun",
      value: 80
    }, {
      label: "July",
      value: 48
    }, {
      label: "Aug",
      value: 66
    }]
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--ink-900)"
    }
  }, "Transaction History"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(TransactionRow, {
    style: {
      padding: "8px 10px"
    },
    avatar: /*#__PURE__*/React.createElement(Avatar, {
      name: "Net Flix",
      size: 30
    }),
    title: "Netflix",
    meta: "22 Jun at 11:20 pm",
    amount: "-$15.99"
  }), /*#__PURE__*/React.createElement(TransactionRow, {
    style: {
      padding: "8px 10px"
    },
    avatar: /*#__PURE__*/React.createElement(Avatar, {
      name: "Dri bbble",
      size: 30
    }),
    title: "Dribbble",
    meta: "04 Jun at 11:00 am",
    amount: "-$12.99"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 60,
      top: 150,
      width: 320
    }
  }, /*#__PURE__*/React.createElement(Card, {
    elevation: "md",
    pad: "none",
    radius: "md",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      padding: 10
    }
  }, /*#__PURE__*/React.createElement(TransactionRow, {
    style: {
      padding: "10px 12px"
    },
    icon: "hand-coins",
    title: "Bank Deposit",
    amount: "+288.00",
    direction: "in"
  }), /*#__PURE__*/React.createElement(TransactionRow, {
    style: {
      padding: "10px 12px"
    },
    avatar: /*#__PURE__*/React.createElement(Avatar, {
      name: "David A",
      size: 38
    }),
    title: "David",
    meta: "Payment received",
    amount: "+300.00",
    direction: "in"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 60,
      top: 120,
      width: 300
    }
  }, /*#__PURE__*/React.createElement(Card, {
    elevation: "md",
    pad: "sm",
    radius: "lg",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(AmountField, {
    label: "Amount to send",
    value: "100",
    currency: ccy,
    onCurrencyChange: () => setCcy(ccy === "USD" ? "EUR" : "USD"),
    style: {
      background: "var(--white)",
      border: "1px solid var(--border-subtle)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, [["Fee", "$0.00"], ["Rate", "107.50"], ["Total", "$100.00"]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, v)))), /*#__PURE__*/React.createElement(AmountField, {
    label: "Recipient will get",
    value: "10,750",
    currency: "BDT",
    readOnly: true,
    style: {
      background: "var(--cream-100)"
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    fullWidth: true
  }, "Continue"))))));
}
Object.assign(window, {
  BordersSection
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/BordersSection.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/DownloadSection.jsx
try { (() => {
const {
  Marquee,
  Button,
  PhoneFrame,
  QuickActions,
  BankCard,
  TransactionRow,
  Avatar,
  Icon,
  Logo
} = window.AtlasDesignSystem_92c2f4;
function AppPeek() {
  return /*#__PURE__*/React.createElement(PhoneFrame, {
    width: 280,
    bezel: "sage"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--cream-100)",
      padding: "10px 16px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "menu",
    size: 20,
    color: "var(--ink-900)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 19,
    color: "var(--ink-900)"
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: "Anderson Darrel",
    size: 30
  }))), /*#__PURE__*/React.createElement(BankCard, {
    width: 248
  }), /*#__PURE__*/React.createElement(QuickActions, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 15,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "var(--ink-900)"
    }
  }, "Recent Activity"), /*#__PURE__*/React.createElement(Icon, {
    name: "ellipsis",
    size: 18,
    color: "var(--ink-500)"
  })), /*#__PURE__*/React.createElement(TransactionRow, {
    style: {
      padding: "10px 12px"
    },
    avatar: /*#__PURE__*/React.createElement(Avatar, {
      name: "David Anderson",
      size: 36
    }),
    title: "David Anderson",
    meta: "30 Jun \xB7 Payment received",
    amount: "+$250.00",
    direction: "in"
  })));
}
function DownloadSection() {
  return /*#__PURE__*/React.createElement("section", {
    id: "download",
    style: {
      padding: "0 48px 96px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      background: "var(--forest-800)",
      borderRadius: "var(--radius-2xl)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(Marquee, {
    size: 34,
    items: ["Digital Banking", "Cash Back", "Instant Debit"],
    style: {
      borderBottom: "1px solid var(--border-inverse)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 48,
      padding: "56px 56px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 30,
      paddingBottom: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 108,
      height: 108,
      background: "var(--white)",
      borderRadius: "var(--radius-md)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      textAlign: "center",
      padding: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "qr-code",
    size: 34,
    color: "var(--forest-800)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      lineHeight: 1.3,
      color: "var(--ink-700)"
    }
  }, "Scan to install")), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: "var(--text-display-2)",
      fontWeight: 700,
      lineHeight: "var(--leading-display)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--white)"
    }
  }, "Download Our", /*#__PURE__*/React.createElement("br", null), "Atlas App"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline-inverse",
    size: "lg",
    icon: "smartphone",
    iconPosition: "left"
  }, "Google Play"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline-inverse",
    size: "lg",
    icon: "apple",
    iconPosition: "left"
  }, "App Store")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18,
      marginTop: 26
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "mailto:hello@atlas.net",
    style: {
      color: "var(--white)",
      fontSize: "var(--text-body-lg)",
      textDecoration: "none"
    }
  }, "hello@atlas.net"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, ["twitter", "instagram", "linkedin", "facebook"].map((s, i) => /*#__PURE__*/React.createElement("span", {
    key: s,
    style: {
      width: 40,
      height: 40,
      borderRadius: "var(--radius-full)",
      border: "1px solid " + (i === 0 ? "var(--lime-500)" : "var(--border-inverse)"),
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s,
    size: 17,
    color: i === 0 ? "var(--lime-500)" : "var(--white)"
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 20,
      marginBottom: -40
    }
  }, /*#__PURE__*/React.createElement(AppPeek, null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 60,
      transform: "rotate(6deg)"
    }
  }, /*#__PURE__*/React.createElement(BankCard, {
    width: 230,
    finish: "cream"
  }))))));
}
Object.assign(window, {
  DownloadSection,
  AppPeek
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/DownloadSection.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/FasterSection.jsx
try { (() => {
const {
  SectionHeading,
  StatBlock,
  BankCard,
  Sparkle,
  Icon,
  Avatar
} = window.AtlasDesignSystem_92c2f4;
function FasterSection() {
  return /*#__PURE__*/React.createElement("section", {
    id: "faster",
    style: {
      padding: "112px 48px 104px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 80,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 40
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: "var(--text-display-2)",
      fontWeight: 700,
      lineHeight: "var(--leading-display)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--ink-900)"
    }
  }, "Make Your", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 78,
      height: 46,
      border: "2px solid var(--lime-500)",
      borderRadius: "var(--radius-full)",
      verticalAlign: "middle",
      marginRight: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "globe",
    size: 26,
    color: "var(--forest-800)"
  })), "Money Move", /*#__PURE__*/React.createElement("br", null), "Faster"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 46,
      height: 46,
      borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border-default)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "credit-card",
    size: 20,
    color: "var(--forest-800)"
  })), /*#__PURE__*/React.createElement(StatBlock, {
    size: "sm",
    value: "7.5m+",
    label: "Daily transactions"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 46,
      height: 46,
      borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border-default)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Sparkle, {
    size: 20,
    color: "var(--forest-800)"
  })), /*#__PURE__*/React.createElement(StatBlock, {
    size: "sm",
    value: "+2%",
    label: "Unlimited daily cashback"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 420,
      marginLeft: "auto",
      fontSize: "var(--text-body-sm)",
      lineHeight: 1.7,
      color: "var(--text-body)"
    }
  }, "Our dream is for people to live and work anywhere seamlessly. That means money without borders: moving it instantly, transparently, conveniently, and \u2014 eventually \u2014 for free."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(BankCard, {
    width: 400,
    finish: "cream",
    network: "Mastercard",
    avatar: /*#__PURE__*/React.createElement(Avatar, {
      name: "Anderson Darrel",
      size: 26
    })
  })))));
}
Object.assign(window, {
  FasterSection
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/FasterSection.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/FeaturesSection.jsx
try { (() => {
const {
  SectionHeading,
  FeatureTile,
  PhoneFrame,
  Button,
  SegmentedControl,
  BarChart,
  TransactionRow,
  Card,
  Icon,
  BankCard
} = window.AtlasDesignSystem_92c2f4;
function TransactionsPeek() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      marginTop: 26,
      marginBottom: -110,
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(PhoneFrame, {
    width: 280
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 18px 40px",
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-left",
    size: 20,
    color: "var(--ink-900)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "var(--ink-900)"
    }
  }, "Transactions"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 13,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sliders-horizontal",
    size: 16,
    color: "var(--ink-900)"
  }), "Filter")), /*#__PURE__*/React.createElement(TransactionRow, {
    style: {
      padding: "12px 14px"
    },
    title: "Transaction",
    meta: "November 20",
    amount: "-$120.30",
    chevron: true
  }), /*#__PURE__*/React.createElement(TransactionRow, {
    style: {
      padding: "12px 14px"
    },
    icon: "wallet",
    title: "Card top-up",
    meta: "November 18",
    amount: "+$400.00",
    direction: "in"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: -6,
      top: 74,
      right: -6
    }
  }, /*#__PURE__*/React.createElement(Card, {
    elevation: "md",
    pad: "none",
    radius: "md"
  }, /*#__PURE__*/React.createElement(TransactionRow, {
    icon: "hand-coins",
    title: "Barclays Bank Deposit",
    amount: "+288.00",
    direction: "in"
  }))));
}
function SpendingPeek() {
  const [tab, setTab] = React.useState("expenses");
  const income = [{
    label: "Mar",
    value: 44
  }, {
    label: "Apr",
    value: 100
  }, {
    label: "May",
    value: 58
  }, {
    label: "Jun",
    value: 86
  }, {
    label: "July",
    value: 52
  }, {
    label: "Aug",
    value: 70
  }];
  const expenses = [{
    label: "Mar",
    value: 62
  }, {
    label: "Apr",
    value: 38
  }, {
    label: "May",
    value: 94
  }, {
    label: "Jun",
    value: 46
  }, {
    label: "July",
    value: 78
  }, {
    label: "Aug",
    value: 55
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 26,
      marginBottom: -70
    }
  }, /*#__PURE__*/React.createElement(Card, {
    elevation: "sm",
    pad: "sm",
    radius: "lg",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    value: tab,
    onChange: setTab,
    options: [{
      value: "income",
      label: "Income",
      icon: "arrow-down-left"
    }, {
      value: "expenses",
      label: "Expenses",
      icon: "arrow-up-right"
    }]
  }), /*#__PURE__*/React.createElement(BarChart, {
    data: tab === "income" ? income : expenses,
    height: 170
  })));
}
function FeaturesSection() {
  return /*#__PURE__*/React.createElement("section", {
    id: "features",
    style: {
      padding: "104px 48px 120px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: 56
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    align: "center",
    eyebrow: "Our features",
    size: "display-2",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "4 Quick Steps To Use Our", /*#__PURE__*/React.createElement("br", null), "Atlas Services")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(FeatureTile, {
    pad: 40,
    icon: "wallet",
    title: "Get paid up within two days early.",
    body: "Use your Atlas debit card to earn automatic cash back rewards at select retailers, including grocery stores, apparel shops, restaurants and more."
  }, /*#__PURE__*/React.createElement(TransactionsPeek, null)), /*#__PURE__*/React.createElement(FeatureTile, {
    pad: 40,
    tone: "sage",
    icon: "line-chart",
    title: "Track the spending money that matters to you",
    body: "That's the beauty of the Watchlist. You decide which spending categories need a little extra attention. Whether you're looking to cut back on dining out or make sure."
  }, /*#__PURE__*/React.createElement(SpendingPeek, null))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(FeatureTile, {
    tone: "sage",
    icon: "globe",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Send money here", /*#__PURE__*/React.createElement("br", null), "to anywhere")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Card, {
    elevation: "sm",
    pad: "none",
    radius: "md",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 16px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: "50%",
      background: "var(--sage-200)",
      flex: "0 0 auto"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 15,
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, "USD"), /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-up-right",
    size: 18,
    color: "var(--forest-800)"
  })), /*#__PURE__*/React.createElement(Card, {
    pad: "none",
    radius: "md",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 16px",
      opacity: 0.55
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: "50%",
      background: "var(--sage-200)",
      flex: "0 0 auto"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 15,
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, "BDT")))), /*#__PURE__*/React.createElement(FeatureTile, {
    icon: "gift",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Mastercard and", /*#__PURE__*/React.createElement("br", null), "Clave cards")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      marginBottom: -90,
      marginLeft: 20,
      transform: "rotate(-12deg)"
    }
  }, /*#__PURE__*/React.createElement(BankCard, {
    width: 230,
    finish: "sage",
    network: "Mastercard"
  }))), /*#__PURE__*/React.createElement(FeatureTile, {
    tone: "forest",
    icon: null,
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Explore our other", /*#__PURE__*/React.createElement("br", null), "product feature"),
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "accent",
      icon: "chevron-right",
      style: {
        marginTop: 14,
        alignSelf: "flex-start"
      }
    }, "View More")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: -60,
      bottom: -70,
      width: 220,
      height: 220,
      borderRadius: "50%",
      background: "rgba(255,255,255,.04)"
    }
  })))));
}
Object.assign(window, {
  FeaturesSection,
  TransactionsPeek,
  SpendingPeek
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/FeaturesSection.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/Hero.jsx
try { (() => {
const {
  Button,
  Logo,
  Sparkle,
  BankCard,
  AvatarStack,
  StatBlock,
  IconButton,
  Icon
} = window.AtlasDesignSystem_92c2f4;
function FannedCards() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: 470,
      height: 430
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: "12% 6% 0 8%",
      background: "var(--cream-100)",
      borderRadius: "50% 50% 46% 46%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 6,
      top: 176,
      transform: "rotate(-38deg)"
    }
  }, /*#__PURE__*/React.createElement(BankCard, {
    width: 230,
    finish: "cream",
    holder: "Anderson Darrel"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 62,
      top: 96,
      transform: "rotate(-20deg)"
    }
  }, /*#__PURE__*/React.createElement(BankCard, {
    width: 240,
    finish: "sage",
    holder: "Anderson Darrel"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 150,
      top: 34,
      transform: "rotate(-7deg)"
    }
  }, /*#__PURE__*/React.createElement(BankCard, {
    width: 268,
    finish: "forest",
    holder: "Anderson Darrel"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: -14,
      bottom: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "play",
    tone: "sage",
    size: "xl",
    label: "Watch the film"
  })));
}
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    id: "hero",
    style: {
      position: "relative",
      overflow: "hidden",
      padding: "40px 48px 96px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: -180,
      top: 60,
      width: 420,
      height: 420,
      background: "var(--glow-lime)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1fr auto 210px",
      gap: 40,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 44,
      maxWidth: 470
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: "var(--text-display-1)",
      fontWeight: 700,
      lineHeight: "var(--leading-display)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--ink-900)"
    }
  }, "Digital Banking", /*#__PURE__*/React.createElement("br", null), "Made For", " ", /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 92,
      height: 52,
      border: "2px solid var(--lime-500)",
      borderRadius: "var(--radius-full)",
      verticalAlign: "middle"
    }
  }, /*#__PURE__*/React.createElement(Sparkle, {
    size: 26
  })), /*#__PURE__*/React.createElement("br", null), "Digital Users"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 26,
      marginBottom: 34,
      maxWidth: 380,
      fontSize: "var(--text-body-md)",
      lineHeight: "var(--leading-body)",
      color: "var(--text-body)"
    }
  }, "Atlas is an all-in-one mobile banking app chock full of all the tools, tips, and tricks you need to take control of your finances."), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    onClick: () => window.atlasGoTo("download")
  }, "Send Money Now"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 86,
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "var(--text-heading-4)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "var(--ink-900)"
    }
  }, "Over 5,000+ ", /*#__PURE__*/React.createElement("span", {
    style: {
      textDecoration: "underline",
      textUnderlineOffset: 4
    }
  }, "Reviews")), /*#__PURE__*/React.createElement(AvatarStack, {
    people: [{
      name: "Ana Ruiz"
    }, {
      name: "Kim Lee"
    }, {
      name: "Sam Ojo"
    }, {
      name: "Eve Diaz"
    }],
    overflowLabel: "5k+"
  }))), /*#__PURE__*/React.createElement(FannedCards, null), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 44,
      display: "flex",
      flexDirection: "column",
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 52,
      height: 52,
      borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border-default)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "grid-2x2",
    size: 24,
    color: "var(--forest-800)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-eyebrow)",
      fontWeight: 600,
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--ink-500)"
    }
  }, "Atlas in numbers"), /*#__PURE__*/React.createElement(StatBlock, {
    value: "7.5M",
    label: "Total daily transactions"
  }), /*#__PURE__*/React.createElement(StatBlock, {
    value: "2.4%",
    label: "Average saving per transfer"
  }))));
}
Object.assign(window, {
  Hero,
  FannedCards
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/ProofSection.jsx
try { (() => {
const {
  SectionHeading,
  TestimonialCard,
  StarRating
} = window.AtlasDesignSystem_92c2f4;
const PARTNERS = ["Coinbase", "Spotify", "Slack", "Dropbox", "Asana", "InVision"];
function ProofSection() {
  return /*#__PURE__*/React.createElement("section", {
    id: "proof",
    style: {
      padding: "0 48px 112px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: 40
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Atlas customer reviews",
    size: "display-2",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Trusted By Over Our", /*#__PURE__*/React.createElement("br", null), "400k Accounts"),
    action: /*#__PURE__*/React.createElement(StarRating, {
      score: "4.8",
      caption: "Score on App Store"
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(TestimonialCard, {
    quote: "Awesome card and app! I am very impressed with Atlas so far \u2014 it lets me send funds abroad at zero cost. It's cheaper than Western Union!",
    author: "Dan Wright"
  }), /*#__PURE__*/React.createElement(TestimonialCard, {
    tone: "sage",
    quote: "I moved my salary across two countries in a week and never once wondered where the money was. The rate I saw was the rate I got.",
    author: "Priya Raman"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 24,
      paddingTop: 16,
      borderTop: "1px solid var(--border-subtle)",
      marginTop: 8
    }
  }, PARTNERS.map(p => /*#__PURE__*/React.createElement("span", {
    key: p,
    title: "Partner logo not supplied with the brand reference",
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 19,
      fontWeight: 600,
      letterSpacing: "-0.02em",
      color: "var(--ink-300)"
    }
  }, p)))));
}
Object.assign(window, {
  ProofSection
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/ProofSection.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/StepsSection.jsx
try { (() => {
const {
  SectionHeading,
  Accordion,
  BankCard,
  Card,
  TransactionRow,
  Avatar
} = window.AtlasDesignSystem_92c2f4;
function StepsSection() {
  return /*#__PURE__*/React.createElement("section", {
    id: "steps",
    style: {
      background: "var(--forest-800)",
      padding: "104px 48px 112px",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 120,
      top: 240,
      width: 360,
      height: 360,
      background: "var(--glow-lime)",
      opacity: 0.5,
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1fr 400px",
      gap: 80,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 34
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    tone: "inverse",
    size: "display-2",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Save When You Send", /*#__PURE__*/React.createElement("br", null), "Worldwide"),
    body: "Use your Atlas debit card to earn automatic cash back rewards at select retailers, including grocery stores, apparel shops, restaurants and more."
  }), /*#__PURE__*/React.createElement(Accordion, {
    items: [{
      title: "Register for free.",
      body: "Save time with automated reporting. From transactions to disputes and fees or pricing."
    }, {
      title: "Choose an amount to send.",
      body: "We show the fee, the rate and the total before you commit to anything."
    }, {
      title: "Add recipient's bank details.",
      body: "Save a recipient once and they appear in your quick-send list next time."
    }, {
      title: "Verify your identity.",
      body: "A one-time check with your passport or ID keeps the account secure."
    }, {
      title: "Pay for your transfer.",
      body: "Pay by card or balance. Most transfers land the same day."
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      paddingTop: 30
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: -20,
      top: 120,
      width: 300,
      height: 300,
      background: "var(--cream-100)",
      borderRadius: "var(--radius-2xl)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(BankCard, {
    width: 300,
    finish: "sage",
    network: "VISA"
  }), /*#__PURE__*/React.createElement(Card, {
    elevation: "md",
    pad: "sm",
    radius: "md",
    style: {
      marginTop: -20,
      marginLeft: 16,
      width: 268,
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--ink-900)"
    }
  }, "Transaction History"), /*#__PURE__*/React.createElement(TransactionRow, {
    style: {
      padding: "8px 0"
    },
    avatar: /*#__PURE__*/React.createElement(Avatar, {
      name: "Net Flix",
      size: 30
    }),
    title: "Netflix",
    meta: "22 Jun at 11:20 pm",
    amount: "-$15.99"
  }), /*#__PURE__*/React.createElement(TransactionRow, {
    style: {
      padding: "8px 0"
    },
    avatar: /*#__PURE__*/React.createElement(Avatar, {
      name: "Dri bbble",
      size: 30
    }),
    title: "Dribbble",
    meta: "04 Jun at 11:00 am",
    amount: "-$60.00"
  }))))));
}
Object.assign(window, {
  StepsSection
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/StepsSection.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/AppShell.jsx
try { (() => {
const {
  Icon,
  Avatar,
  Logo
} = window.AtlasDesignSystem_92c2f4;
const TABS = [{
  id: "home",
  icon: "house",
  label: "Home"
}, {
  id: "stats",
  icon: "line-chart",
  label: "Stats"
}, {
  id: "send",
  icon: "arrow-up-down",
  label: "Send"
}, {
  id: "cards",
  icon: "credit-card",
  label: "Cards"
}];
function AppHeader({
  title,
  onMenu,
  showAvatar = true,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 20px 14px"
    }
  }, onBack ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onBack,
    style: {
      border: "none",
      background: "transparent",
      padding: 0,
      cursor: "pointer",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-left",
    size: 22,
    color: "var(--ink-900)"
  })) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onMenu,
    style: {
      border: "none",
      background: "transparent",
      padding: 0,
      cursor: "pointer",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "menu",
    size: 22,
    color: "var(--ink-900)"
  })), title && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 19,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "var(--ink-900)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 21,
    color: "var(--ink-900)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: -1,
      right: -1,
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "var(--negative-500)",
      border: "1.5px solid var(--white)"
    }
  })), showAvatar && /*#__PURE__*/React.createElement(Avatar, {
    name: "Anderson Darrel",
    size: 32
  })));
}
function TabBar({
  active,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      padding: "12px 12px 22px",
      background: "var(--white)",
      borderTop: "1px solid var(--border-subtle)"
    }
  }, TABS.map(t => {
    const on = t.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      type: "button",
      onClick: () => onChange(t.id),
      style: {
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        padding: "2px 10px"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: t.icon,
      size: 22,
      color: on ? "var(--forest-800)" : "var(--ink-300)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: on ? "var(--forest-800)" : "var(--ink-500)"
      }
    }, t.label), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 18,
        height: 3,
        borderRadius: 3,
        background: on ? "var(--lime-500)" : "transparent"
      }
    }));
  }));
}
Object.assign(window, {
  AppHeader,
  TabBar,
  ATLAS_TABS: TABS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/CardsScreen.jsx
try { (() => {
const {
  BankCard,
  Switch,
  Card,
  Icon,
  Badge,
  Avatar
} = window.AtlasDesignSystem_92c2f4;
const CARDS = [{
  finish: "forest",
  label: "Atlas Debit",
  network: "VISA",
  number: "4083 3245 5467 1078"
}, {
  finish: "sage",
  label: "Atlas Everyday",
  network: "Mastercard",
  number: "5312 8890 4471 2201"
}, {
  finish: "cream",
  label: "Atlas Credit",
  network: "Mastercard",
  number: "5100 6612 0034 9987"
}];
function CardsScreen() {
  const [i, setI] = React.useState(0);
  const [frozen, setFrozen] = React.useState(false);
  const [online, setOnline] = React.useState(true);
  const card = CARDS[i];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18,
      padding: "0 20px 24px",
      background: "var(--cream-100)",
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      opacity: frozen ? 0.5 : 1,
      transition: "opacity var(--duration-base) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement(BankCard, {
    width: 330,
    finish: card.finish,
    network: card.network,
    avatar: /*#__PURE__*/React.createElement(Avatar, {
      name: "Anderson Darrel",
      size: 26
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      gap: 8
    }
  }, CARDS.map((c, n) => /*#__PURE__*/React.createElement("button", {
    key: c.label,
    type: "button",
    onClick: () => setI(n),
    "aria-label": c.label,
    style: {
      width: n === i ? 26 : 8,
      height: 8,
      borderRadius: 999,
      border: "none",
      background: n === i ? "var(--forest-800)" : "var(--sage-300)",
      cursor: "pointer",
      transition: "var(--transition-control)"
    }
  }))), /*#__PURE__*/React.createElement(Card, {
    tone: "white",
    pad: "sm",
    radius: "lg",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 17,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "var(--ink-900)"
    }
  }, card.label), /*#__PURE__*/React.createElement(Badge, {
    tone: frozen ? "negative" : "positive"
  }, frozen ? "Frozen" : "Active")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 15,
      letterSpacing: ".06em",
      color: "var(--ink-900)"
    }
  }, card.number), /*#__PURE__*/React.createElement(Icon, {
    name: "copy",
    size: 17,
    color: "var(--ink-500)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      letterSpacing: ".1em",
      textTransform: "uppercase",
      color: "var(--ink-500)",
      fontWeight: 600
    }
  }, "Expires"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 14,
      color: "var(--ink-900)"
    }
  }, "08/26")), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      letterSpacing: ".1em",
      textTransform: "uppercase",
      color: "var(--ink-500)",
      fontWeight: 600
    }
  }, "CVV"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 14,
      color: "var(--ink-900)"
    }
  }, "\u2022\u2022\u2022")))), /*#__PURE__*/React.createElement(Card, {
    tone: "white",
    pad: "sm",
    radius: "lg",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: frozen,
    onChange: setFrozen,
    label: "Freeze this card"
  }), /*#__PURE__*/React.createElement(Switch, {
    checked: online,
    onChange: setOnline,
    label: "Allow online payments"
  })));
}
Object.assign(window, {
  CardsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/CardsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/HomeScreen.jsx
try { (() => {
const {
  BankCard,
  QuickActions,
  TransactionRow,
  Avatar,
  Chip,
  Icon
} = window.AtlasDesignSystem_92c2f4;
const ACTIVITY = [{
  id: 1,
  period: "day",
  title: "David Anderson",
  meta: "Today · Payment received",
  amount: "+$250.00",
  direction: "in",
  avatar: "David Anderson"
}, {
  id: 2,
  period: "day",
  title: "Blue Bottle Coffee",
  meta: "Today · Card payment",
  amount: "-$6.40",
  icon: "cup-soda"
}, {
  id: 3,
  period: "week",
  title: "Barclays Bank Deposit",
  meta: "30 Jun · Salary",
  amount: "+288.00",
  direction: "in",
  icon: "hand-coins"
}, {
  id: 4,
  period: "week",
  title: "Netflix",
  meta: "28 Jun · Subscription",
  amount: "-$15.99",
  icon: "monitor-play"
}, {
  id: 5,
  period: "month",
  title: "Rent — 44 Halsey St",
  meta: "01 Jun · Transfer",
  amount: "-$1,850.00",
  icon: "house"
}, {
  id: 6,
  period: "month",
  title: "Dribbble Pro",
  meta: "04 Jun · Subscription",
  amount: "-$60.00",
  icon: "dribbble"
}];
const ORDER = {
  day: 1,
  week: 2,
  month: 3,
  "6months": 4
};
function HomeScreen({
  onAction
}) {
  const [period, setPeriod] = React.useState("week");
  const rows = ACTIVITY.filter(a => ORDER[a.period] <= ORDER[period]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20,
      padding: "0 20px 24px",
      background: "var(--cream-100)",
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(BankCard, {
    width: 350
  }))), /*#__PURE__*/React.createElement(QuickActions, {
    onSelect: a => onAction && onAction(a)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "var(--ink-900)"
    }
  }, "Recent Activity"), /*#__PURE__*/React.createElement(Icon, {
    name: "ellipsis",
    size: 20,
    color: "var(--ink-500)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      overflowX: "auto",
      paddingBottom: 2
    }
  }, [["day", "This day"], ["week", "This week"], ["month", "This month"], ["6months", "6 months"]].map(([id, label]) => /*#__PURE__*/React.createElement(Chip, {
    key: id,
    selected: period === id,
    onSelect: () => setPeriod(id)
  }, label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, rows.map(r => /*#__PURE__*/React.createElement(TransactionRow, {
    key: r.id,
    title: r.title,
    meta: r.meta,
    amount: r.amount,
    direction: r.direction,
    icon: r.icon,
    chevron: true,
    avatar: r.avatar ? /*#__PURE__*/React.createElement(Avatar, {
      name: r.avatar,
      size: 44
    }) : undefined
  }))));
}
Object.assign(window, {
  HomeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/SendMoneyScreen.jsx
try { (() => {
const {
  AmountField,
  Button,
  Card,
  Avatar,
  Icon,
  Badge
} = window.AtlasDesignSystem_92c2f4;
const RATE = 107.5;
const RECIPIENTS = [{
  name: "Anisur Rahman",
  meta: "BRAC Bank · BDT"
}, {
  name: "Ana Ruiz",
  meta: "Santander · EUR"
}, {
  name: "David Anderson",
  meta: "Monzo · GBP"
}];
function SendMoneyScreen({
  onDone
}) {
  const [amount, setAmount] = React.useState("100");
  const [who, setWho] = React.useState(0);
  const [sent, setSent] = React.useState(false);
  const num = parseFloat(String(amount).replace(/,/g, "")) || 0;
  const out = (num * RATE).toLocaleString("en-US", {
    maximumFractionDigits: 0
  });
  if (sent) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        background: "var(--cream-100)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 32,
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 76,
        height: 76,
        borderRadius: "50%",
        background: "var(--lime-500)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 36,
      color: "var(--forest-800)"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        color: "var(--ink-900)"
      }
    }, "Transfer on its way"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontSize: 14,
        lineHeight: 1.6,
        color: "var(--text-body)",
        maxWidth: 260
      }
    }, RECIPIENTS[who].name, " gets ", out, " BDT. Most transfers land the same day."), /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      onClick: () => {
        setSent(false);
        onDone && onDone();
      }
    }, "Back to wallet"));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18,
      padding: "0 20px 24px",
      background: "var(--cream-100)",
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "white",
    pad: "sm",
    radius: "lg",
    elevation: "sm",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(AmountField, {
    label: "Amount to send",
    value: amount,
    onChange: e => setAmount(e.target.value),
    currency: "USD"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, [["Fee", "$0.00"], ["Rate", RATE.toFixed(2)], ["Total to pay", "$" + num.toFixed(2)]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, v)))), /*#__PURE__*/React.createElement(AmountField, {
    label: "Recipient will get",
    value: out,
    currency: "BDT",
    readOnly: true,
    style: {
      background: "var(--cream-100)"
    }
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "soft",
    icon: "zap"
  }, "Arrives today")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "var(--ink-900)"
    }
  }, "Send to"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, RECIPIENTS.map((r, i) => /*#__PURE__*/React.createElement("button", {
    key: r.name,
    type: "button",
    onClick: () => setWho(i),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 16px",
      background: "var(--white)",
      border: "1px solid " + (who === i ? "var(--forest-800)" : "transparent"),
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: r.name,
    size: 44
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, r.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, r.meta)), who === i && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18,
    color: "var(--forest-800)"
  })))), /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    fullWidth: true,
    size: "lg",
    onClick: () => setSent(true)
  }, "Continue"));
}
Object.assign(window, {
  SendMoneyScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/SendMoneyScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/StatisticsScreen.jsx
try { (() => {
const {
  SegmentedControl,
  BarChart,
  Card,
  TransactionRow,
  Avatar,
  StatBlock
} = window.AtlasDesignSystem_92c2f4;
const INCOME = [{
  label: "Mar",
  value: 44
}, {
  label: "Apr",
  value: 100
}, {
  label: "May",
  value: 58
}, {
  label: "Jun",
  value: 86
}, {
  label: "July",
  value: 52
}, {
  label: "Aug",
  value: 70
}];
const EXPENSES = [{
  label: "Mar",
  value: 62
}, {
  label: "Apr",
  value: 38
}, {
  label: "May",
  value: 94
}, {
  label: "Jun",
  value: 46
}, {
  label: "July",
  value: 78
}, {
  label: "Aug",
  value: 55
}];
function StatisticsScreen() {
  const [tab, setTab] = React.useState("income");
  const income = tab === "income";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18,
      padding: "0 20px 24px",
      background: "var(--cream-100)",
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    value: tab,
    onChange: setTab,
    options: [{
      value: "income",
      label: "Income",
      icon: "arrow-down-left"
    }, {
      value: "expenses",
      label: "Expenses",
      icon: "arrow-up-right"
    }]
  }), /*#__PURE__*/React.createElement(Card, {
    tone: "white",
    pad: "sm",
    radius: "lg",
    elevation: "sm",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(StatBlock, {
    size: "md",
    value: income ? "$8,420" : "$5,116",
    label: income ? "Received, last 6 months" : "Spent, last 6 months"
  }), /*#__PURE__*/React.createElement(StatBlock, {
    size: "sm",
    value: income ? "+12%" : "-4%",
    label: "vs. previous"
  })), /*#__PURE__*/React.createElement(BarChart, {
    data: income ? INCOME : EXPENSES,
    height: 190
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "var(--ink-900)"
    }
  }, "Transaction History"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, (income ? [["Barclays Bank Deposit", "30 Jun · Salary", "+288.00", "hand-coins"], ["Ana Ruiz", "19 Jun · Request paid", "+$60.00", null], ["Cashback reward", "16 Jun · Perks", "+$4.80", "gift"]] : [["Netflix", "22 Jun at 11:20 pm", "-$15.99", "monitor-play"], ["Dribbble", "04 Jun at 11:00 am", "-$12.99", "dribbble"], ["Themeforest", "26 Aug at 11:00 am", "-$8.65", "shopping-bag"]]).map(([title, meta, amount, icon]) => /*#__PURE__*/React.createElement(TransactionRow, {
    key: title,
    title: title,
    meta: meta,
    amount: amount,
    direction: income ? "in" : "out",
    icon: icon || undefined,
    avatar: icon ? undefined : /*#__PURE__*/React.createElement(Avatar, {
      name: title,
      size: 44
    })
  }))));
}
Object.assign(window, {
  StatisticsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/StatisticsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/TransactionsScreen.jsx
try { (() => {
const {
  TransactionRow,
  Avatar,
  Input,
  Card,
  Icon,
  Chip
} = window.AtlasDesignSystem_92c2f4;
const ALL = [{
  title: "Barclays Bank Deposit",
  meta: "November 20 · Salary",
  amount: "+288.00",
  direction: "in",
  icon: "hand-coins",
  type: "in"
}, {
  title: "Transaction",
  meta: "November 20",
  amount: "-$120.30",
  icon: "credit-card",
  type: "out"
}, {
  title: "Ana Ruiz",
  meta: "November 19 · Request paid",
  amount: "+$60.00",
  direction: "in",
  avatar: "Ana Ruiz",
  type: "in"
}, {
  title: "Themeforest",
  meta: "November 18 · Subscription",
  amount: "-$8.65",
  icon: "shopping-bag",
  type: "out"
}, {
  title: "Whole Foods Market",
  meta: "November 17 · Card payment",
  amount: "-$74.12",
  icon: "shopping-cart",
  type: "out"
}, {
  title: "Cashback reward",
  meta: "November 16 · Perks",
  amount: "+$4.80",
  direction: "in",
  icon: "gift",
  type: "in"
}, {
  title: "Transport for London",
  meta: "November 15 · Card payment",
  amount: "-$18.40",
  icon: "train-front",
  type: "out"
}];
function TransactionsScreen() {
  const [filter, setFilter] = React.useState("all");
  const [q, setQ] = React.useState("");
  const rows = ALL.filter(r => (filter === "all" || r.type === filter) && r.title.toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16,
      padding: "0 20px 24px",
      background: "var(--cream-100)",
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Search transactions",
    icon: "search",
    value: q,
    onChange: e => setQ(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["all", "All"], ["in", "Money in"], ["out", "Money out"]].map(([id, label]) => /*#__PURE__*/React.createElement(Chip, {
    key: id,
    selected: filter === id,
    onSelect: () => setFilter(id)
  }, label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement(TransactionRow, {
    key: i,
    title: r.title,
    meta: r.meta,
    amount: r.amount,
    direction: r.direction,
    icon: r.icon,
    chevron: true,
    avatar: r.avatar ? /*#__PURE__*/React.createElement(Avatar, {
      name: r.avatar,
      size: 44
    }) : undefined
  })), !rows.length && /*#__PURE__*/React.createElement(Card, {
    tone: "white",
    pad: "md",
    style: {
      textAlign: "center",
      color: "var(--text-muted)",
      fontSize: 14
    }
  }, "Nothing matches that search.")));
}
Object.assign(window, {
  TransactionsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/TransactionsScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.ICON_NAMES = __ds_scope.ICON_NAMES;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Sparkle = __ds_scope.Sparkle;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.AvatarStack = __ds_scope.AvatarStack;

__ds_ns.BankCard = __ds_scope.BankCard;

__ds_ns.BarChart = __ds_scope.BarChart;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.StarRating = __ds_scope.StarRating;

__ds_ns.TransactionRow = __ds_scope.TransactionRow;

__ds_ns.AmountField = __ds_scope.AmountField;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.FeatureTile = __ds_scope.FeatureTile;

__ds_ns.Marquee = __ds_scope.Marquee;

__ds_ns.PhoneFrame = __ds_scope.PhoneFrame;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.StatBlock = __ds_scope.StatBlock;

__ds_ns.TestimonialCard = __ds_scope.TestimonialCard;

__ds_ns.Accordion = __ds_scope.Accordion;

__ds_ns.Navbar = __ds_scope.Navbar;

__ds_ns.QuickActions = __ds_scope.QuickActions;

__ds_ns.SiteFooter = __ds_scope.SiteFooter;

})();
