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

const CARD_VERSION = "1.2.0";

// ── Unique instance counter for gradient IDs ────────────────────────────────

let _instanceCounter = 0;

// ── Color utilities ──────────────────────────────────────────────────────────

/**
 * Map a temperature to an RGB color string.
 *   Cold end  → blue  (#2196F3)
 *   Neutral   → gray  (#9E9E9E)
 *   Hot end   → red   (#F44336)
 */
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

// ── Helper: parse entity states ──────────────────────────────────────────────

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

// ── SVG namespace ────────────────────────────────────────────────────────────

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

function htmlEl(tag, attrs = {}) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

// ── The Card ─────────────────────────────────────────────────────────────────

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

  // ── Configuration ──

  setConfig(config) {
    if (!config.t1_temperature) throw new Error("t1_temperature is required");
    if (!config.t2_temperature) throw new Error("t2_temperature is required");
    if (!config.t3_temperature) throw new Error("t3_temperature is required");
    if (!config.t4_temperature) throw new Error("t4_temperature is required");
    this._config = config;
    this._entityIds = [
      config.t1_temperature,
      config.t2_temperature,
      config.t3_temperature,
      config.t4_temperature,
      config.supply_fan_speed,
      config.exhaust_fan_speed,
      config.bypass_position,
      config.filter_status,
      config.supply_fan_rpm,
      config.exhaust_fan_rpm,
    ].filter(Boolean);
    this._built = false;
  }

  set hass(hass) {
    const changed = !this._hass || this._entityIds.some(
      (id) => hass.states[id] !== this._hass.states[id]
    );
    this._hass = hass;
    if (changed) {
      if (!this._built) {
        this._buildDom();
      }
      this._updateDom();
    }
  }

  getCardSize() {
    return 5;
  }

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
      t1_temperature: "",
      t2_temperature: "",
      t3_temperature: "",
      t4_temperature: "",
    };
  }

  // ── Lifecycle ──

  connectedCallback() {
    if (this._config && this._hass && !this._built) {
      this._buildDom();
      this._updateDom();
    }
  }

  disconnectedCallback() {}

  // ── Gradient ID helper (per-instance unique) ──

  _gid(name) {
    return `whr930-${this._instanceId}-${name}`;
  }

  // ── Build static DOM (called once per config change) ──

  _buildDom() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    const cfg = this._config;
    const hasSupplyFan = !!cfg.supply_fan_speed;
    const hasExhaustFan = !!cfg.exhaust_fan_speed;

    // ── Style ──
    const style = htmlEl("style");
    style.textContent = `
      :host { display: block; }
      ha-card { overflow: hidden; }
      .card-content { padding: 12px 16px 16px; }
      svg { width: 100%; height: auto; display: block; }
      .info-strip {
        display: flex; justify-content: center; align-items: center;
        gap: 8px; padding: 6px 0 0;
        border-top: 1px solid var(--divider-color, #e0e0e0);
        margin-top: 4px;
      }
      .info-label { color: var(--secondary-text-color, #999); font-size: 12px; }
      .info-value { font-size: 12px; font-weight: 600; }
      .hidden { display: none; }
    `;

    // ── ha-card ──
    const card = htmlEl("ha-card");
    if (cfg.title) card.setAttribute("header", cfg.title);

    const content = htmlEl("div");
    content.className = "card-content";

    // ── SVG ──
    const svg = svgEl("svg", { viewBox: "0 0 600 310" });

    // ── Defs: gradients ──
    const defs = svgEl("defs");

    // Gradients use userSpaceOnUse so they work on <line> elements
    // (objectBoundingBox fails for horizontal lines with zero-height bbox).
    // Each gradient spans the x-range of the line segments it covers.
    const gradients = [
      { name: "supply-in",   x1: "70",  x2: "270" },  // outside → HX entry (y=100)
      { name: "supply-hx",   x1: "270", x2: "330" },  // diagonal through HX
      { name: "supply-out",  x1: "330", x2: "530" },  // HX exit → inside (y=190)
      { name: "exhaust-in",  x1: "330", x2: "530" },  // inside → HX entry (y=100)
      { name: "exhaust-hx",  x1: "270", x2: "330" },  // diagonal through HX
      { name: "exhaust-out", x1: "70",  x2: "270" },  // HX exit → outside (y=190)
    ];

    this._refs.gradStops = {};
    for (const g of gradients) {
      const grad = svgEl("linearGradient", {
        id: this._gid(g.name),
        gradientUnits: "userSpaceOnUse",
        x1: g.x1, y1: "0", x2: g.x2, y2: "0",
      });
      const stop0 = svgEl("stop", { offset: "0%" });
      const stop1 = svgEl("stop", { offset: "100%" });
      grad.appendChild(stop0);
      grad.appendChild(stop1);
      defs.appendChild(grad);
      this._refs.gradStops[g.name] = [stop0, stop1];
    }

    // Fan blade symbol
    const fanSymbol = svgEl("symbol", { id: this._gid("fan-icon"), viewBox: "-12 -12 24 24" });
    fanSymbol.innerHTML = `
      <circle cx="0" cy="0" r="11" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <circle cx="0" cy="0" r="2" fill="currentColor"/>
      <path d="M0,-2 C3,-6 8,-8 2,-11 C-1,-9 -3,-6 0,-2Z" fill="currentColor" opacity="0.8"/>
      <path d="M0,-2 C3,-6 8,-8 2,-11 C-1,-9 -3,-6 0,-2Z" fill="currentColor" opacity="0.8" transform="rotate(120)"/>
      <path d="M0,-2 C3,-6 8,-8 2,-11 C-1,-9 -3,-6 0,-2Z" fill="currentColor" opacity="0.8" transform="rotate(240)"/>
    `;
    defs.appendChild(fanSymbol);

    // HX cross-hatch pattern
    const pattern = svgEl("pattern", {
      id: this._gid("hx-pattern"),
      x: "0", y: "0", width: "12", height: "12",
      patternUnits: "userSpaceOnUse",
    });
    pattern.innerHTML = `
      <line x1="0" y1="0" x2="12" y2="12" stroke="var(--secondary-text-color, #666)" stroke-width="0.5" opacity="0.3"/>
      <line x1="12" y1="0" x2="0" y2="12" stroke="var(--secondary-text-color, #666)" stroke-width="0.5" opacity="0.3"/>
    `;
    defs.appendChild(pattern);

    svg.appendChild(defs);

    // ── Unit box ──
    svg.appendChild(svgEl("rect", {
      x: "185", y: "50", width: "230", height: "200", rx: "10", ry: "10",
      fill: "var(--card-background-color, #fff)",
      stroke: "var(--divider-color, #ddd)", "stroke-width": "1.5", opacity: "0.6",
    }));
    svg.appendChild(Object.assign(svgEl("text", {
      x: "300", y: "42", "text-anchor": "middle",
      fill: "var(--secondary-text-color, #999)", "font-size": "11", "font-weight": "500",
    }), { textContent: "WHR930" }));

    // ── Heat exchanger ──
    svg.appendChild(svgEl("rect", {
      x: "268", y: "90", width: "64", height: "110", rx: "6", ry: "6",
      fill: `url(#${this._gid("hx-pattern")})`,
      stroke: "var(--divider-color, #ccc)", "stroke-width": "1",
    }));
    svg.appendChild(Object.assign(svgEl("text", {
      x: "300", y: "150", "text-anchor": "middle",
      fill: "var(--secondary-text-color, #999)", "font-size": "9", "font-weight": "400",
    }), { textContent: "HX" }));

    // ── Duct layout ──
    // Supply path:  Outside(T1,top-left) → fan → HX cross → Inside(T2,bottom-right)
    // Exhaust path: Inside(T3,bottom-right) → fan → HX cross → Outside(T4,top-left... no)
    //
    // Actually for a WHR930 counter-flow HX the layout is:
    //   Supply:  left y=100 ──fan──> enters HX top-left, crosses to exit bottom-right ──> right y=190
    //   Exhaust: right y=190... no, let's keep it simpler:
    //
    // Horizontal layout with crossing diagonal paths inside the HX:
    //   Supply:  left y=100 ─── fan ─── ╲  (diagonal down through HX) ─── ╱ ─── right y=190... 
    //
    // Simplest correct approach: supply and exhaust are both horizontal but they
    // swap vertical position inside the HX via diagonal lines:
    //
    //   T1 ────── fan ──── ╲           ╱ ────── T2
    //   (y=100, top-left)    ╲  HX  ╱    (y=190, bottom-right)
    //                          ╲  ╱
    //                           ╳
    //                          ╱  ╲
    //   T4 ──────────────── ╱  HX  ╲ ── fan ── T3
    //   (y=190, bottom-left)          (y=100, top-right)
    //
    // Supply:  left@y=100 → fan@228 → diagonal 270,100→330,190 → right@y=190
    // Exhaust: right@y=100 → fan@372 → diagonal 330,100→270,190 → left@y=190

    // ── Supply path (T1 top-left → T2 bottom-right) ──
    // Segment 1: outside to fan gap (y=100)
    this._refs.supplyLines = [];
    this._refs.exhaustLines = [];

    const mkLine = (x1, y1, x2, y2, grad) => {
      const attrs = {
        x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2),
        stroke: `url(#${this._gid(grad)})`, "stroke-width": "8",
        "stroke-linecap": "round",
      };
      return svgEl("line", attrs);
    };

    // Supply: outside → before fan (y=100)
    const sL1 = mkLine(70, 100, 214, 100, "supply-in");
    svg.appendChild(sL1);
    this._refs.supplyLines.push(sL1);
    // Supply: after fan → HX entry (y=100)
    const sL2 = mkLine(242, 100, 270, 100, "supply-in");
    svg.appendChild(sL2);
    this._refs.supplyLines.push(sL2);
    // Supply: diagonal through HX (100→190)
    const sL3 = mkLine(270, 100, 330, 190, "supply-hx");
    svg.appendChild(sL3);
    this._refs.supplyLines.push(sL3);
    // Supply: HX exit → inside (y=190)
    const sL4 = mkLine(330, 190, 530, 190, "supply-out");
    svg.appendChild(sL4);
    this._refs.supplyLines.push(sL4);

    // Exhaust: inside → before fan (y=100, right side)
    const eL1 = mkLine(530, 100, 386, 100, "exhaust-in");
    svg.appendChild(eL1);
    this._refs.exhaustLines.push(eL1);
    // Exhaust: after fan → HX entry (y=100)
    const eL2 = mkLine(358, 100, 330, 100, "exhaust-in");
    svg.appendChild(eL2);
    this._refs.exhaustLines.push(eL2);
    // Exhaust: diagonal through HX (100→190)
    const eL3 = mkLine(330, 100, 270, 190, "exhaust-hx");
    svg.appendChild(eL3);
    this._refs.exhaustLines.push(eL3);
    // Exhaust: HX exit → outside (y=190)
    const eL4 = mkLine(270, 190, 70, 190, "exhaust-out");
    svg.appendChild(eL4);
    this._refs.exhaustLines.push(eL4);

    // ── Bypass path (supply air goes straight across, skipping the HX cross) ──
    this._refs.bypassPath = svgEl("line", {
      x1: "270", y1: "100", x2: "330", y2: "100",
      "stroke-width": "6", "stroke-linecap": "round",
      opacity: "0",
    });
    svg.appendChild(this._refs.bypassPath);

    // ── Flow direction arrows ──
    // Arrows sit ON the duct lines but are rendered last (top z-order).
    // They're large enough (14px tall) to be clearly visible over the 8px ducts.
    // Each arrow has a thin outline in card-background-color for contrast.

    // Supply arrow 1: top-left, pointing right (y=100)
    this._refs.arrowSupply1 = svgEl("polygon", { points: "150,91 164,100 150,109" });
    // Supply arrow 2: bottom-right, pointing right (y=190)
    this._refs.arrowSupply2 = svgEl("polygon", { points: "460,181 474,190 460,199" });
    // Exhaust arrow 1: top-right, pointing left (y=100)
    this._refs.arrowExhaust1 = svgEl("polygon", { points: "450,91 436,100 450,109" });
    // Exhaust arrow 2: bottom-left, pointing left (y=190)
    this._refs.arrowExhaust2 = svgEl("polygon", { points: "140,181 126,190 140,199" });
    for (const a of [this._refs.arrowSupply1, this._refs.arrowSupply2,
                      this._refs.arrowExhaust1, this._refs.arrowExhaust2]) {
      a.setAttribute("stroke", "var(--card-background-color, #fff)");
      a.setAttribute("stroke-width", "1.5");
      a.setAttribute("stroke-linejoin", "round");
    }
    // (arrows are appended after fan icons below)

    // ── Fan icons (appended AFTER lines so they render on top) ──
    // Each fan gets a background circle to mask the duct line behind it.
    const fanBg = { r: "14", fill: "var(--card-background-color, #fff)" };

    // Supply fan: top row, left of HX (x=228, y=100)
    svg.appendChild(svgEl("circle", { cx: "228", cy: "100", ...fanBg }));
    this._refs.supplyFanGroup = svgEl("g", { transform: "translate(228, 100)" });
    if (!hasSupplyFan) this._refs.supplyFanGroup.classList.add("hidden");
    this._refs.supplyFanGroup.appendChild(svgEl("use", {
      href: `#${this._gid("fan-icon")}`,
      x: "-14", y: "-14", width: "28", height: "28",
    }));
    svg.appendChild(this._refs.supplyFanGroup);

    this._refs.supplyFanLabel = svgEl("text", {
      x: "228", y: "128", "text-anchor": "middle",
      fill: "var(--primary-text-color, #333)", "font-size": "10", "font-weight": "600",
    });
    if (!hasSupplyFan) this._refs.supplyFanLabel.classList.add("hidden");
    svg.appendChild(this._refs.supplyFanLabel);

    this._refs.supplyFanRpm = svgEl("text", {
      x: "228", y: "139", "text-anchor": "middle",
      fill: "var(--secondary-text-color, #999)", "font-size": "8",
    });
    svg.appendChild(this._refs.supplyFanRpm);

    // Exhaust fan: top row, right of HX (x=372, y=100)
    svg.appendChild(svgEl("circle", { cx: "372", cy: "100", ...fanBg }));
    this._refs.exhaustFanGroup = svgEl("g", { transform: "translate(372, 100)" });
    if (!hasExhaustFan) this._refs.exhaustFanGroup.classList.add("hidden");
    this._refs.exhaustFanGroup.appendChild(svgEl("use", {
      href: `#${this._gid("fan-icon")}`,
      x: "-14", y: "-14", width: "28", height: "28",
    }));
    svg.appendChild(this._refs.exhaustFanGroup);

    this._refs.exhaustFanLabel = svgEl("text", {
      x: "372", y: "128", "text-anchor": "middle",
      fill: "var(--primary-text-color, #333)", "font-size": "10", "font-weight": "600",
    });
    if (!hasExhaustFan) this._refs.exhaustFanLabel.classList.add("hidden");
    svg.appendChild(this._refs.exhaustFanLabel);

    this._refs.exhaustFanRpm = svgEl("text", {
      x: "372", y: "139", "text-anchor": "middle",
      fill: "var(--secondary-text-color, #999)", "font-size": "8",
    });
    svg.appendChild(this._refs.exhaustFanRpm);

    // ── Flow direction arrows (appended last so they render on top) ──
    for (const a of [this._refs.arrowSupply1, this._refs.arrowSupply2,
                      this._refs.arrowExhaust1, this._refs.arrowExhaust2]) {
      svg.appendChild(a);
    }

    // ── Temperature labels ──
    // T1: Outside intake (top-left)
    this._refs.t1Temp = svgEl("text", {
      x: "45", y: "96", "text-anchor": "middle", "font-size": "16", "font-weight": "700",
    });
    svg.appendChild(this._refs.t1Temp);
    svg.appendChild(Object.assign(svgEl("text", {
      x: "45", y: "112", "text-anchor": "middle",
      fill: "var(--secondary-text-color, #999)", "font-size": "9",
    }), { textContent: "Outside" }));

    // T2: Supply to inside (bottom-right)
    this._refs.t2Temp = svgEl("text", {
      x: "555", y: "186", "text-anchor": "middle", "font-size": "16", "font-weight": "700",
    });
    svg.appendChild(this._refs.t2Temp);
    svg.appendChild(Object.assign(svgEl("text", {
      x: "555", y: "202", "text-anchor": "middle",
      fill: "var(--secondary-text-color, #999)", "font-size": "9",
    }), { textContent: "Supply" }));

    // T3: Extract from inside (top-right)
    this._refs.t3Temp = svgEl("text", {
      x: "555", y: "96", "text-anchor": "middle", "font-size": "16", "font-weight": "700",
    });
    svg.appendChild(this._refs.t3Temp);
    svg.appendChild(Object.assign(svgEl("text", {
      x: "555", y: "112", "text-anchor": "middle",
      fill: "var(--secondary-text-color, #999)", "font-size": "9",
    }), { textContent: "Extract" }));

    // T4: Exhaust to outside (bottom-left)
    this._refs.t4Temp = svgEl("text", {
      x: "45", y: "186", "text-anchor": "middle", "font-size": "16", "font-weight": "700",
    });
    svg.appendChild(this._refs.t4Temp);
    svg.appendChild(Object.assign(svgEl("text", {
      x: "45", y: "202", "text-anchor": "middle",
      fill: "var(--secondary-text-color, #999)", "font-size": "9",
    }), { textContent: "Exhaust" }));

    // ── Info labels ──
    this._refs.efficiencyText = svgEl("text", {
      x: "300", y: "270", "text-anchor": "middle",
      fill: "var(--primary-text-color, #333)", "font-size": "13", "font-weight": "600",
    });
    svg.appendChild(this._refs.efficiencyText);

    this._refs.bypassText = svgEl("text", {
      x: "300", y: "288", "text-anchor": "middle",
      fill: "var(--secondary-text-color, #999)", "font-size": "11",
    });
    svg.appendChild(this._refs.bypassText);

    content.appendChild(svg);

    // ── Filter status strip ──
    this._refs.filterStrip = htmlEl("div");
    this._refs.filterStrip.className = "info-strip hidden";
    const filterLabel = htmlEl("span");
    filterLabel.className = "info-label";
    filterLabel.textContent = "Filter";
    this._refs.filterValue = htmlEl("span");
    this._refs.filterValue.className = "info-value";
    this._refs.filterStrip.appendChild(filterLabel);
    this._refs.filterStrip.appendChild(this._refs.filterValue);
    content.appendChild(this._refs.filterStrip);

    card.appendChild(content);

    // ── Mount ──
    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(card);

    this._built = true;
  }

  // ── Update dynamic attributes (called on every entity state change) ──

  _updateDom() {
    if (!this._built || !this._config || !this._hass) return;

    const cfg = this._config;
    const hass = this._hass;
    const refs = this._refs;

    // ── Read entity states ──
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

    // ── Compute colors ──
    const temps = [t1, t2, t3, t4].filter((v) => v !== null);
    const minT = temps.length ? Math.min(...temps) : 0;
    const maxT = temps.length ? Math.max(...temps) : 40;
    const disabled = "var(--disabled-color, #888)";

    const c1 = t1 !== null ? tempToColor(t1, minT, maxT) : disabled;
    const c2 = t2 !== null ? tempToColor(t2, minT, maxT) : disabled;
    const c3 = t3 !== null ? tempToColor(t3, minT, maxT) : disabled;
    const c4 = t4 !== null ? tempToColor(t4, minT, maxT) : disabled;

    // ── Update gradient stops ──
    const setGrad = (name, colorA, colorB) => {
      const [s0, s1] = refs.gradStops[name];
      s0.setAttribute("stop-color", colorA);
      s1.setAttribute("stop-color", colorB);
    };
    setGrad("supply-in", c1, c1);
    setGrad("supply-hx", c1, c2);
    setGrad("supply-out", c2, c2);
    setGrad("exhaust-in", c3, c3);
    setGrad("exhaust-hx", c4, c3);   // x runs left-to-right but flow is right-to-left: T4(left)→T3(right)
    setGrad("exhaust-out", c4, c4);

    // ── Bypass ──
    const bypassFraction = bypass !== null ? Math.max(0, Math.min(100, bypass)) / 100 : 0;
    const hxOpacity = 1 - bypassFraction * 0.6;

    for (const line of refs.supplyLines) line.setAttribute("opacity", hxOpacity);
    for (const line of refs.exhaustLines) line.setAttribute("opacity", hxOpacity);

    const bypassVisible = bypassFraction > 0.01;
    refs.bypassPath.setAttribute("stroke", c1);
    refs.bypassPath.setAttribute("opacity", bypassVisible ? Math.min(1, bypassFraction * 1.2) : "0");
    refs.bypassPath.setAttribute("stroke-dasharray", bypassFraction > 0.9 ? "none" : "8 4");

    // ── Arrows ──
    refs.arrowSupply1.setAttribute("fill", c1);   // top-left (outside intake)
    refs.arrowSupply2.setAttribute("fill", c2);   // bottom-right (supply to inside)
    refs.arrowExhaust1.setAttribute("fill", c3);  // top-right (extract from inside)
    refs.arrowExhaust2.setAttribute("fill", c4);  // bottom-left (exhaust to outside)

    // ── Temperature labels ──
    const fmtTemp = (v) => v !== null ? `${v.toFixed(1)}\u00B0` : "\u2014";
    refs.t1Temp.textContent = fmtTemp(t1);
    refs.t1Temp.setAttribute("fill", c1);
    refs.t2Temp.textContent = fmtTemp(t2);
    refs.t2Temp.setAttribute("fill", c2);
    refs.t3Temp.textContent = fmtTemp(t3);
    refs.t3Temp.setAttribute("fill", c3);
    refs.t4Temp.textContent = fmtTemp(t4);
    refs.t4Temp.setAttribute("fill", c4);

    // ── Efficiency ──
    let effText = "";
    if (t1 !== null && t2 !== null && t3 !== null) {
      const denom = t3 - t1;
      if (Math.abs(denom) > 0.5) {
        const eff = ((t2 - t1) / denom) * 100;
        if (eff < 0 || eff > 100) {
          effText = "Efficiency: N/A";
        } else {
          effText = `Efficiency: ${Math.round(eff)}%`;
        }
      }
    }
    refs.efficiencyText.textContent = effText;

    // ── Bypass label ──
    refs.bypassText.textContent = bypass !== null ? `Bypass: ${Math.round(bypass)}%` : "";

    // ── Fan speed labels ──
    const fmtPct = (v) => v !== null ? `${Math.round(v)}%` : "";

    if (cfg.supply_fan_speed) {
      refs.supplyFanLabel.textContent = supplySpeed !== null ? fmtPct(supplySpeed) : "\u2014";
      refs.supplyFanGroup.setAttribute("color", c1);
    }
    if (cfg.exhaust_fan_speed) {
      refs.exhaustFanLabel.textContent = exhaustSpeed !== null ? fmtPct(exhaustSpeed) : "\u2014";
      refs.exhaustFanGroup.setAttribute("color", c3);
    }

    refs.supplyFanRpm.textContent =
      cfg.supply_fan_rpm && supplyRpm !== null ? `${Math.round(supplyRpm)} RPM` : "";
    refs.exhaustFanRpm.textContent =
      cfg.exhaust_fan_rpm && exhaustRpm !== null ? `${Math.round(exhaustRpm)} RPM` : "";

    // ── Filter status ──
    if (cfg.filter_status && filterStatus) {
      refs.filterStrip.classList.remove("hidden");
      refs.filterValue.textContent = filterStatus;
      refs.filterValue.style.color = filterStatus.toLowerCase() === "full"
        ? "var(--error-color, #db4437)"
        : "var(--success-color, #43a047)";
    } else {
      refs.filterStrip.classList.add("hidden");
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
