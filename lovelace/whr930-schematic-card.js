/**
 * WHR930 Schematic Card for Home Assistant
 *
 * A custom Lovelace card that shows a static schematic overview of a Zehnder
 * WHR930 heat recovery ventilation unit with live temperature, fan speed,
 * bypass, and heat recovery efficiency data.
 *
 * Installation:
 *   1. Copy this file to <HA config>/www/whr930-schematic-card.js
 *   2. Add as a dashboard resource:
 *      URL: /local/whr930-schematic-card.js
 *      Type: JavaScript Module
 *
 * Usage (YAML):
 *   type: custom:whr930-schematic-card
 *   t1_temperature: sensor.outside_to_whr930_temperature
 *   t2_temperature: sensor.whr930_to_inside_temperature
 *   t3_temperature: sensor.inside_to_whr930_temperature
 *   t4_temperature: sensor.whr930_to_outside_temperature
 *   supply_fan_speed: sensor.supply_fan_speed
 *   exhaust_fan_speed: sensor.exhaust_fan_speed
 *   bypass_position: sensor.bypass_position
 *   filter_status: sensor.filter_status          # optional
 *   supply_fan_rpm: sensor.supply_fan_rpm        # optional
 *   exhaust_fan_rpm: sensor.exhaust_fan_rpm      # optional
 *   title: "Heat Recovery Ventilation"           # optional
 */

const CARD_VERSION = "1.3.1";

let _instanceCounter = 0;

// ── Color utilities ──────────────────────────────────────────────────────────

function tempToColor(temp, minT, maxT) {
  if (minT === maxT) return "rgb(158,158,158)";
  let t = (temp - minT) / (maxT - minT);
  t = Math.max(0, Math.min(1, t));
  let r, g, b;
  if (t <= 0.5) {
    const s = t / 0.5;
    r = Math.round(33 + (158 - 33) * s);
    g = Math.round(150 + (158 - 150) * s);
    b = Math.round(243 + (158 - 243) * s);
  } else {
    const s = (t - 0.5) / 0.5;
    r = Math.round(158 + (244 - 158) * s);
    g = Math.round(158 + (67 - 158) * s);
    b = Math.round(158 + (54 - 158) * s);
  }
  return `rgb(${r},${g},${b})`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function numState(hass, entityId) {
  if (!entityId) return null;
  const s = hass.states[entityId];
  if (!s || s.state === "unavailable" || s.state === "unknown") return null;
  const v = parseFloat(s.state);
  return isNaN(v) ? null : v;
}

function strState(hass, entityId) {
  if (!entityId) return null;
  const s = hass.states[entityId];
  if (!s || s.state === "unavailable" || s.state === "unknown") return null;
  return s.state;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function htmlEl(tag, attrs = {}) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// ── The Card ─────────────────────────────────────────────────────────────────
//
// Compact layout designed for narrow columns (4-col dashboard).
// ViewBox: 320 x 200  — wider aspect ratio, fewer SVG units = larger text at
// any rendered pixel width.
//
// Schematic (coordinates):
//
//   T1 (outside)            T3 (extract)
//   20,60 ──►── fan ──╲      ╱──◄── fan ── 300,60
//                  118  ╲    ╱  202
//                        ╲  ╱
//                   140   ╳   180
//                        ╱  ╲
//   T4 (exhaust)        ╱    ╲          T2 (supply)
//   20,140 ──◄────── ──╱      ╲── ──────►── 300,140
//
//   Supply:  left@60 → fan → diag 140,60→180,140 → right@140
//   Exhaust: right@60 → fan → diag 180,60→140,140 → left@140

class Whr930SchematicCard extends HTMLElement {

  constructor() {
    super();
    this._instanceId = _instanceCounter++;
    this._built = false;
    this._refs = {};
    this._hass = null;
    this._config = null;
    this._entityIds = [];
  }

  setConfig(config) {
    if (!config.t1_temperature) throw new Error("t1_temperature is required");
    if (!config.t2_temperature) throw new Error("t2_temperature is required");
    if (!config.t3_temperature) throw new Error("t3_temperature is required");
    if (!config.t4_temperature) throw new Error("t4_temperature is required");
    this._config = config;
    this._entityIds = [
      config.t1_temperature, config.t2_temperature,
      config.t3_temperature, config.t4_temperature,
      config.supply_fan_speed, config.exhaust_fan_speed,
      config.bypass_position, config.filter_status,
      config.supply_fan_rpm, config.exhaust_fan_rpm,
    ].filter(Boolean);
    this._built = false;
  }

  set hass(hass) {
    const changed = !this._hass || this._entityIds.some(
      (id) => hass.states[id] !== this._hass.states[id]
    );
    this._hass = hass;
    if (changed) {
      if (!this._built) this._buildDom();
      this._updateDom();
    }
  }

  getCardSize() { return 4; }

  static getConfigForm() {
    return {
      schema: [
        { name: "title", selector: { text: {} } },
        { name: "t1_temperature", required: true, selector: { entity: { domain: "sensor" } } },
        { name: "t2_temperature", required: true, selector: { entity: { domain: "sensor" } } },
        { name: "t3_temperature", required: true, selector: { entity: { domain: "sensor" } } },
        { name: "t4_temperature", required: true, selector: { entity: { domain: "sensor" } } },
        { name: "supply_fan_speed", selector: { entity: { domain: "sensor" } } },
        { name: "exhaust_fan_speed", selector: { entity: { domain: "sensor" } } },
        { name: "bypass_position", selector: { entity: { domain: "sensor" } } },
        { name: "filter_status", selector: { entity: { domain: "sensor" } } },
        { name: "supply_fan_rpm", selector: { entity: { domain: "sensor" } } },
        { name: "exhaust_fan_rpm", selector: { entity: { domain: "sensor" } } },
      ],
    };
  }

  static getStubConfig() {
    return {
      title: "Heat Recovery Ventilation",
      t1_temperature: "", t2_temperature: "",
      t3_temperature: "", t4_temperature: "",
    };
  }

  connectedCallback() {
    if (this._config && this._hass && !this._built) {
      this._buildDom();
      this._updateDom();
    }
  }

  disconnectedCallback() {}

  _gid(name) { return `whr930-${this._instanceId}-${name}`; }

  // ── Layout constants ──
  // All coordinates in one place for easy tuning.
  // ViewBox: 320 x 200
  //
  //  Duct Y positions:  top=60, bottom=140
  //  Left edge:         20     (temp labels at x=10..40)
  //  Right edge:        300    (temp labels at x=280..310)
  //  Unit box:          85..235 x 30..170
  //  HX box:            136..184 x 42..158
  //  Supply fan:        118, y=60     Exhaust fan: 202, y=60
  //  Diagonal:          140,60 → 180,140  and  180,60 → 140,140

  _buildDom() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });

    const cfg = this._config;
    const hasSupplyFan = !!cfg.supply_fan_speed;
    const hasExhaustFan = !!cfg.exhaust_fan_speed;

    const style = htmlEl("style");
    style.textContent = `
      :host { display: block; }
      ha-card { overflow: hidden; }
      .card-content { padding: 8px 8px 10px; }
      svg { width: 100%; height: auto; display: block; }
      .info-row {
        display: flex; justify-content: center; align-items: center;
        gap: 12px; padding: 4px 0 0; flex-wrap: wrap;
      }
      .info-item {
        font-size: 11px; color: var(--secondary-text-color, #999);
      }
      .info-item b {
        font-weight: 600; color: var(--primary-text-color, #333);
      }
      .hidden { display: none; }
    `;

    const card = htmlEl("ha-card");
    if (cfg.title) card.setAttribute("header", cfg.title);
    const content = htmlEl("div");
    content.className = "card-content";

    // ── SVG ──
    const svg = svgEl("svg", { viewBox: "0 0 320 200" });
    const defs = svgEl("defs");

    // ── Gradients (userSpaceOnUse) ──
    const gradDefs = [
      { name: "supply-in",   x1: 20,  x2: 140 },
      { name: "supply-hx",   x1: 140, x2: 180 },
      { name: "supply-out",  x1: 180, x2: 300 },
      { name: "exhaust-in",  x1: 180, x2: 300 },
      { name: "exhaust-hx",  x1: 140, x2: 180 },
      { name: "exhaust-out", x1: 20,  x2: 140 },
    ];
    this._refs.gradStops = {};
    for (const g of gradDefs) {
      const grad = svgEl("linearGradient", {
        id: this._gid(g.name), gradientUnits: "userSpaceOnUse",
        x1: String(g.x1), y1: "0", x2: String(g.x2), y2: "0",
      });
      const s0 = svgEl("stop", { offset: "0%" });
      const s1 = svgEl("stop", { offset: "100%" });
      grad.appendChild(s0);
      grad.appendChild(s1);
      defs.appendChild(grad);
      this._refs.gradStops[g.name] = [s0, s1];
    }

    // Fan symbol
    const fan = svgEl("symbol", { id: this._gid("fan"), viewBox: "-12 -12 24 24" });
    fan.innerHTML = `
      <circle cx="0" cy="0" r="11" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <circle cx="0" cy="0" r="2" fill="currentColor"/>
      <path d="M0,-2 C3,-6 8,-8 2,-11 C-1,-9 -3,-6 0,-2Z" fill="currentColor" opacity="0.8"/>
      <path d="M0,-2 C3,-6 8,-8 2,-11 C-1,-9 -3,-6 0,-2Z" fill="currentColor" opacity="0.8" transform="rotate(120)"/>
      <path d="M0,-2 C3,-6 8,-8 2,-11 C-1,-9 -3,-6 0,-2Z" fill="currentColor" opacity="0.8" transform="rotate(240)"/>
    `;
    defs.appendChild(fan);

    // HX pattern
    const pat = svgEl("pattern", {
      id: this._gid("hx"), x: "0", y: "0", width: "10", height: "10",
      patternUnits: "userSpaceOnUse",
    });
    pat.innerHTML = `
      <line x1="0" y1="0" x2="10" y2="10" stroke="var(--secondary-text-color,#666)" stroke-width="0.5" opacity="0.3"/>
      <line x1="10" y1="0" x2="0" y2="10" stroke="var(--secondary-text-color,#666)" stroke-width="0.5" opacity="0.3"/>
    `;
    defs.appendChild(pat);
    svg.appendChild(defs);

    // ── Unit box ──
    svg.appendChild(svgEl("rect", {
      x: "85", y: "30", width: "150", height: "140", rx: "8", ry: "8",
      fill: "var(--card-background-color,#fff)",
      stroke: "var(--divider-color,#ddd)", "stroke-width": "1.5", opacity: "0.6",
    }));
    svg.appendChild(Object.assign(svgEl("text", {
      x: "160", y: "24", "text-anchor": "middle",
      fill: "var(--secondary-text-color,#999)", "font-size": "9", "font-weight": "500",
    }), { textContent: "WHR930" }));

    // ── HX box ──
    svg.appendChild(svgEl("rect", {
      x: "136", y: "42", width: "48", height: "116", rx: "4", ry: "4",
      fill: `url(#${this._gid("hx")})`,
      stroke: "var(--divider-color,#ccc)", "stroke-width": "0.75",
    }));

    // ── Duct lines ──
    const mk = (x1, y1, x2, y2, grad) => {
      return svgEl("line", {
        x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2),
        stroke: `url(#${this._gid(grad)})`, "stroke-width": "6",
        "stroke-linecap": "round",
      });
    };

    this._refs.supplyLines = [];
    this._refs.exhaustLines = [];

    // Supply: T1(left,y=60) → fan → diag → T2(right,y=140)
    const sL1 = mk(20, 60, 105, 60, "supply-in");
    const sL2 = mk(131, 60, 140, 60, "supply-in");
    const sL3 = mk(140, 60, 180, 140, "supply-hx");
    const sL4 = mk(180, 140, 300, 140, "supply-out");
    for (const l of [sL1, sL2, sL3, sL4]) {
      svg.appendChild(l);
      this._refs.supplyLines.push(l);
    }

    // Exhaust: T3(right,y=60) → fan → diag → T4(left,y=140)
    const eL1 = mk(300, 60, 215, 60, "exhaust-in");
    const eL2 = mk(189, 60, 180, 60, "exhaust-in");
    const eL3 = mk(180, 60, 140, 140, "exhaust-hx");
    const eL4 = mk(140, 140, 20, 140, "exhaust-out");
    for (const l of [eL1, eL2, eL3, eL4]) {
      svg.appendChild(l);
      this._refs.exhaustLines.push(l);
    }

    // ── Bypass (horizontal, skipping diagonal) ──
    this._refs.bypassPath = svgEl("line", {
      x1: "140", y1: "60", x2: "180", y2: "60",
      "stroke-width": "5", "stroke-linecap": "round", opacity: "0",
    });
    svg.appendChild(this._refs.bypassPath);

    // ── Fan backgrounds + icons (on top of lines) ──
    const fanBg = { r: "13", fill: "var(--card-background-color,#fff)" };

    svg.appendChild(svgEl("circle", { cx: "118", cy: "60", ...fanBg }));
    this._refs.supplyFanGroup = svgEl("g", { transform: "translate(118,60)" });
    if (!hasSupplyFan) this._refs.supplyFanGroup.classList.add("hidden");
    this._refs.supplyFanGroup.appendChild(svgEl("use", {
      href: `#${this._gid("fan")}`, x: "-12", y: "-12", width: "24", height: "24",
    }));
    svg.appendChild(this._refs.supplyFanGroup);

    svg.appendChild(svgEl("circle", { cx: "202", cy: "60", ...fanBg }));
    this._refs.exhaustFanGroup = svgEl("g", { transform: "translate(202,60)" });
    if (!hasExhaustFan) this._refs.exhaustFanGroup.classList.add("hidden");
    this._refs.exhaustFanGroup.appendChild(svgEl("use", {
      href: `#${this._gid("fan")}`, x: "-12", y: "-12", width: "24", height: "24",
    }));
    svg.appendChild(this._refs.exhaustFanGroup);

    // ── Fan speed labels (below the fan icons, inside unit box) ──
    this._refs.supplyFanLabel = svgEl("text", {
      x: "118", y: "82", "text-anchor": "middle",
      fill: "var(--primary-text-color,#333)", "font-size": "8", "font-weight": "600",
    });
    if (!hasSupplyFan) this._refs.supplyFanLabel.classList.add("hidden");
    svg.appendChild(this._refs.supplyFanLabel);

    this._refs.exhaustFanLabel = svgEl("text", {
      x: "202", y: "82", "text-anchor": "middle",
      fill: "var(--primary-text-color,#333)", "font-size": "8", "font-weight": "600",
    });
    if (!hasExhaustFan) this._refs.exhaustFanLabel.classList.add("hidden");
    svg.appendChild(this._refs.exhaustFanLabel);

    // ── Direction arrows (on top of everything) ──
    // Large enough to read, with white outline for contrast against duct color.
    // Supply: → on top-left, → on bottom-right
    this._refs.arrowSupply1 = svgEl("polygon", { points: "60,52 72,60 60,68" });
    this._refs.arrowSupply2 = svgEl("polygon", { points: "250,132 262,140 250,148" });
    // Exhaust: ← on top-right, ← on bottom-left
    this._refs.arrowExhaust1 = svgEl("polygon", { points: "260,52 248,60 260,68" });
    this._refs.arrowExhaust2 = svgEl("polygon", { points: "70,132 58,140 70,148" });

    for (const a of [this._refs.arrowSupply1, this._refs.arrowSupply2,
                      this._refs.arrowExhaust1, this._refs.arrowExhaust2]) {
      a.setAttribute("stroke", "var(--card-background-color,#fff)");
      a.setAttribute("stroke-width", "1.5");
      a.setAttribute("stroke-linejoin", "round");
      svg.appendChild(a);
    }

    // ── Temperature labels ──
    // Placed at the duct endpoints, outside the unit box.
    // Larger font (13px) for readability at narrow widths.

    // T1: Outside intake (top-left, y=60)
    this._refs.t1Temp = svgEl("text", {
      x: "10", y: "43", "text-anchor": "start", "font-size": "13", "font-weight": "700",
    });
    svg.appendChild(this._refs.t1Temp);
    svg.appendChild(Object.assign(svgEl("text", {
      x: "10", y: "55", "text-anchor": "start",
      fill: "var(--secondary-text-color,#999)", "font-size": "8",
    }), { textContent: "Outside" }));

    // T3: Extract from inside (top-right, y=60)
    this._refs.t3Temp = svgEl("text", {
      x: "310", y: "43", "text-anchor": "end", "font-size": "13", "font-weight": "700",
    });
    svg.appendChild(this._refs.t3Temp);
    svg.appendChild(Object.assign(svgEl("text", {
      x: "310", y: "55", "text-anchor": "end",
      fill: "var(--secondary-text-color,#999)", "font-size": "8",
    }), { textContent: "Extract" }));

    // T4: Exhaust to outside (bottom-left, y=140)
    this._refs.t4Temp = svgEl("text", {
      x: "10", y: "157", "text-anchor": "start", "font-size": "13", "font-weight": "700",
    });
    svg.appendChild(this._refs.t4Temp);
    svg.appendChild(Object.assign(svgEl("text", {
      x: "10", y: "169", "text-anchor": "start",
      fill: "var(--secondary-text-color,#999)", "font-size": "8",
    }), { textContent: "Exhaust" }));

    // T2: Supply to inside (bottom-right, y=140)
    this._refs.t2Temp = svgEl("text", {
      x: "310", y: "157", "text-anchor": "end", "font-size": "13", "font-weight": "700",
    });
    svg.appendChild(this._refs.t2Temp);
    svg.appendChild(Object.assign(svgEl("text", {
      x: "310", y: "169", "text-anchor": "end",
      fill: "var(--secondary-text-color,#999)", "font-size": "8",
    }), { textContent: "Supply" }));

    // ── Bottom info (efficiency, bypass) — rendered as SVG text ──
    this._refs.efficiencyText = svgEl("text", {
      x: "160", y: "190", "text-anchor": "middle",
      fill: "var(--primary-text-color,#333)", "font-size": "10", "font-weight": "600",
    });
    svg.appendChild(this._refs.efficiencyText);

    // (bypass label removed — schematic updates visually based on bypass state)

    content.appendChild(svg);

    // ── Filter + RPM info strip (HTML below SVG) ──
    this._refs.infoRow = htmlEl("div");
    this._refs.infoRow.className = "info-row hidden";

    this._refs.filterItem = htmlEl("span");
    this._refs.filterItem.className = "info-item hidden";
    this._refs.infoRow.appendChild(this._refs.filterItem);

    this._refs.supplyRpmItem = htmlEl("span");
    this._refs.supplyRpmItem.className = "info-item hidden";
    this._refs.infoRow.appendChild(this._refs.supplyRpmItem);

    this._refs.exhaustRpmItem = htmlEl("span");
    this._refs.exhaustRpmItem.className = "info-item hidden";
    this._refs.infoRow.appendChild(this._refs.exhaustRpmItem);

    content.appendChild(this._refs.infoRow);

    card.appendChild(content);
    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(card);
    this._built = true;
  }

  _updateDom() {
    if (!this._built || !this._config || !this._hass) return;

    const cfg = this._config;
    const hass = this._hass;
    const refs = this._refs;

    const t1 = numState(hass, cfg.t1_temperature);
    const t2 = numState(hass, cfg.t2_temperature);
    const t3 = numState(hass, cfg.t3_temperature);
    const t4 = numState(hass, cfg.t4_temperature);
    const supplySpeed = numState(hass, cfg.supply_fan_speed);
    const exhaustSpeed = numState(hass, cfg.exhaust_fan_speed);
    const bypass = numState(hass, cfg.bypass_position);
    const filterStatus = strState(hass, cfg.filter_status);
    const supplyRpm = numState(hass, cfg.supply_fan_rpm);
    const exhaustRpm = numState(hass, cfg.exhaust_fan_rpm);

    const temps = [t1, t2, t3, t4].filter((v) => v !== null);
    const minT = temps.length ? Math.min(...temps) : 0;
    const maxT = temps.length ? Math.max(...temps) : 40;
    const dis = "var(--disabled-color,#888)";

    const c1 = t1 !== null ? tempToColor(t1, minT, maxT) : dis;
    const c2 = t2 !== null ? tempToColor(t2, minT, maxT) : dis;
    const c3 = t3 !== null ? tempToColor(t3, minT, maxT) : dis;
    const c4 = t4 !== null ? tempToColor(t4, minT, maxT) : dis;

    const setG = (n, a, b) => {
      const [s0, s1] = refs.gradStops[n];
      s0.setAttribute("stop-color", a);
      s1.setAttribute("stop-color", b);
    };
    setG("supply-in", c1, c1);
    setG("supply-hx", c1, c2);
    setG("supply-out", c2, c2);
    setG("exhaust-in", c3, c3);
    setG("exhaust-hx", c4, c3);  // flow is right-to-left: T4(left) → T3(right)
    setG("exhaust-out", c4, c4);

    // Bypass
    const bFrac = bypass !== null ? Math.max(0, Math.min(100, bypass)) / 100 : 0;
    const hxOp = 1 - bFrac * 0.6;
    for (const l of refs.supplyLines) l.setAttribute("opacity", hxOp);
    for (const l of refs.exhaustLines) l.setAttribute("opacity", hxOp);
    refs.bypassPath.setAttribute("stroke", c1);
    refs.bypassPath.setAttribute("opacity", bFrac > 0.01 ? Math.min(1, bFrac * 1.2) : "0");
    refs.bypassPath.setAttribute("stroke-dasharray", bFrac > 0.9 ? "none" : "6 3");

    // Arrows
    refs.arrowSupply1.setAttribute("fill", c1);
    refs.arrowSupply2.setAttribute("fill", c2);
    refs.arrowExhaust1.setAttribute("fill", c3);
    refs.arrowExhaust2.setAttribute("fill", c4);

    // Temperatures
    const ft = (v) => v !== null ? `${v.toFixed(1)}\u00B0` : "\u2014";
    refs.t1Temp.textContent = ft(t1);  refs.t1Temp.setAttribute("fill", c1);
    refs.t2Temp.textContent = ft(t2);  refs.t2Temp.setAttribute("fill", c2);
    refs.t3Temp.textContent = ft(t3);  refs.t3Temp.setAttribute("fill", c3);
    refs.t4Temp.textContent = ft(t4);  refs.t4Temp.setAttribute("fill", c4);

    // Efficiency
    let eff = "";
    if (t1 !== null && t2 !== null && t3 !== null) {
      const d = t3 - t1;
      if (Math.abs(d) > 0.5) {
        const e = ((t2 - t1) / d) * 100;
        eff = (e < 0 || e > 100) ? "Efficiency: N/A" : `Efficiency: ${Math.round(e)}%`;
      }
    }
    refs.efficiencyText.textContent = eff;
    // bypass label removed — schematic updates visually based on bypass state

    // Fan labels
    const fp = (v) => v !== null ? `${Math.round(v)}%` : "";
    if (cfg.supply_fan_speed) {
      refs.supplyFanLabel.textContent = supplySpeed !== null ? fp(supplySpeed) : "\u2014";
      refs.supplyFanGroup.setAttribute("color", c1);
    }
    if (cfg.exhaust_fan_speed) {
      refs.exhaustFanLabel.textContent = exhaustSpeed !== null ? fp(exhaustSpeed) : "\u2014";
      refs.exhaustFanGroup.setAttribute("color", c3);
    }

    // Info row (filter + RPMs)
    let hasInfo = false;

    if (cfg.filter_status && filterStatus) {
      refs.filterItem.classList.remove("hidden");
      refs.filterItem.innerHTML = `Filter: <b style="color:${
        filterStatus.toLowerCase() === "full"
          ? "var(--error-color,#db4437)" : "var(--success-color,#43a047)"
      }">${filterStatus}</b>`;
      hasInfo = true;
    } else {
      refs.filterItem.classList.add("hidden");
    }

    if (cfg.supply_fan_rpm && supplyRpm !== null) {
      refs.supplyRpmItem.classList.remove("hidden");
      refs.supplyRpmItem.innerHTML = `Supply: <b>${Math.round(supplyRpm)} RPM</b>`;
      hasInfo = true;
    } else {
      refs.supplyRpmItem.classList.add("hidden");
    }

    if (cfg.exhaust_fan_rpm && exhaustRpm !== null) {
      refs.exhaustRpmItem.classList.remove("hidden");
      refs.exhaustRpmItem.innerHTML = `Exhaust: <b>${Math.round(exhaustRpm)} RPM</b>`;
      hasInfo = true;
    } else {
      refs.exhaustRpmItem.classList.add("hidden");
    }

    if (hasInfo) {
      refs.infoRow.classList.remove("hidden");
    } else {
      refs.infoRow.classList.add("hidden");
    }
  }
}

// ── Registration ─────────────────────────────────────────────────────────────

customElements.define("whr930-schematic-card", Whr930SchematicCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "whr930-schematic-card",
  name: "WHR930 Schematic",
  preview: false,
  description: `Schematic overview of a Zehnder WHR930 heat recovery ventilation unit (v${CARD_VERSION})`,
});

console.info(
  `%c WHR930-SCHEMATIC-CARD %c v${CARD_VERSION} `,
  "background: #555; color: #fff; padding: 2px 6px; border-radius: 3px 0 0 3px;",
  "background: #2196F3; color: #fff; padding: 2px 6px; border-radius: 0 3px 3px 0;"
);
