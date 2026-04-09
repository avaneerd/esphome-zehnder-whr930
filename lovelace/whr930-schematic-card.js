/**
 * WHR930 Schematic Card for Home Assistant
 *
 * A custom Lovelace card that shows a schematic overview of a Zehnder WHR930
 * heat recovery ventilation unit with live temperature, fan speed, bypass,
 * and heat recovery efficiency data.
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

const CARD_VERSION = "1.1.0";

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
    this._refs = {};   // named references to DOM elements for updates
    this._hass = null;
    this._config = null;
    this._entityIds = [];
    // Track animation durations to detect changes that require animation rebuild
    this._curSupplyAnimDur = 0;
    this._curExhaustAnimDur = 0;
    this._curBypassAnimDur = 0;
    this._curSupplyFanDur = 0;
    this._curExhaustFanDur = 0;
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
    // Config changed — force full rebuild on next render
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

  disconnectedCallback() {
    // No timers or listeners to clean up currently, but this is the place
    // to do so if we add any in the future.
  }

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

      @keyframes spin-cw  { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
      @keyframes spin-ccw { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }

      /* spin-cw and spin-ccw are applied dynamically via style.animation on fan icons */
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

    // Gradient definitions — we'll create them here and update stop colors in _updateDom
    const gradients = [
      { name: "supply-in",   horizontal: true },
      { name: "supply-hx",   horizontal: true },
      { name: "supply-out",  horizontal: true },
      { name: "exhaust-in",  horizontal: true },
      { name: "exhaust-hx",  horizontal: true },
      { name: "exhaust-out", horizontal: true },
      { name: "bypass",      horizontal: true },
    ];

    this._refs.gradStops = {};
    for (const g of gradients) {
      const grad = svgEl("linearGradient", {
        id: this._gid(g.name),
        x1: "0", y1: "0",
        x2: g.horizontal ? "1" : "0",
        y2: g.horizontal ? "0" : "1",
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

    // HX pattern
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
    this._refs.hxRect = svgEl("rect", {
      x: "268", y: "90", width: "64", height: "110", rx: "6", ry: "6",
      fill: `url(#${this._gid("hx-pattern")})`,
      stroke: "var(--divider-color, #ccc)", "stroke-width": "1",
    });
    svg.appendChild(this._refs.hxRect);
    svg.appendChild(Object.assign(svgEl("text", {
      x: "300", y: "150", "text-anchor": "middle",
      fill: "var(--secondary-text-color, #999)", "font-size": "9", "font-weight": "400",
    }), { textContent: "HX" }));

    // ── Supply path lines (left-to-right, y=100) ──
    // Each segment is a separate line so we can apply gradients independently
    const supplySegments = [
      { x1: "70",  x2: "195", grad: "supply-in",  cap: true },
      { x1: "195", x2: "270", grad: "supply-in",  cap: false },
      { x1: "270", x2: "330", grad: "supply-hx",  cap: false },
      { x1: "330", x2: "405", grad: "supply-out", cap: false },
      { x1: "405", x2: "530", grad: "supply-out", cap: true },
    ];
    this._refs.supplyLines = [];
    for (const seg of supplySegments) {
      const attrs = {
        x1: seg.x1, y1: "100", x2: seg.x2, y2: "100",
        stroke: `url(#${this._gid(seg.grad)})`, "stroke-width": "8",
      };
      if (seg.cap) attrs["stroke-linecap"] = "round";
      const line = svgEl("line", attrs);
      svg.appendChild(line);
      this._refs.supplyLines.push(line);
    }

    // Supply flow animation overlay
    this._refs.supplyAnim = svgEl("line", {
      x1: "70", y1: "100", x2: "530", y2: "100",
      stroke: "var(--card-background-color, #fff)", "stroke-width": "8",
      "stroke-dasharray": "4 20", "stroke-linecap": "round", opacity: "0.5",
    });
    svg.appendChild(this._refs.supplyAnim);

    // ── Exhaust path lines (right-to-left, y=190) ──
    const exhaustSegments = [
      { x1: "530", x2: "405", grad: "exhaust-in",  cap: true },
      { x1: "405", x2: "330", grad: "exhaust-in",  cap: false },
      { x1: "330", x2: "270", grad: "exhaust-hx",  cap: false },
      { x1: "270", x2: "195", grad: "exhaust-out", cap: false },
      { x1: "195", x2: "70",  grad: "exhaust-out", cap: true },
    ];
    this._refs.exhaustLines = [];
    for (const seg of exhaustSegments) {
      const attrs = {
        x1: seg.x1, y1: "190", x2: seg.x2, y2: "190",
        stroke: `url(#${this._gid(seg.grad)})`, "stroke-width": "8",
      };
      if (seg.cap) attrs["stroke-linecap"] = "round";
      const line = svgEl("line", attrs);
      svg.appendChild(line);
      this._refs.exhaustLines.push(line);
    }

    // Exhaust flow animation overlay
    this._refs.exhaustAnim = svgEl("line", {
      x1: "530", y1: "190", x2: "70", y2: "190",
      stroke: "var(--card-background-color, #fff)", "stroke-width": "8",
      "stroke-dasharray": "4 20", "stroke-linecap": "round", opacity: "0.5",
    });
    svg.appendChild(this._refs.exhaustAnim);

    // ── Bypass path ──
    this._refs.bypassPath = svgEl("path", {
      d: "M 250 100 C 250 70, 350 70, 350 100",
      "stroke-width": "6", fill: "none", "stroke-linecap": "round",
    });
    svg.appendChild(this._refs.bypassPath);

    // Bypass animation overlay
    this._refs.bypassAnim = svgEl("path", {
      d: "M 250 100 C 250 70, 350 70, 350 100",
      stroke: "var(--card-background-color, #fff)", "stroke-width": "6", fill: "none",
      "stroke-dasharray": "3 16", "stroke-linecap": "round",
    });
    svg.appendChild(this._refs.bypassAnim);

    // ── Flow direction arrows ──
    this._refs.arrowSupply1 = svgEl("polygon", { points: "152,93 162,100 152,107" });
    this._refs.arrowSupply2 = svgEl("polygon", { points: "462,93 472,100 462,107" });
    this._refs.arrowExhaust1 = svgEl("polygon", { points: "448,183 438,190 448,197" });
    this._refs.arrowExhaust2 = svgEl("polygon", { points: "138,183 128,190 138,197" });
    for (const a of [this._refs.arrowSupply1, this._refs.arrowSupply2,
                      this._refs.arrowExhaust1, this._refs.arrowExhaust2]) {
      a.setAttribute("opacity", "0.7");
      svg.appendChild(a);
    }

    // ── Fan icons ──
    // Supply fan group (only if entity configured)
    this._refs.supplyFanGroup = svgEl("g", { transform: "translate(228, 100)" });
    if (!hasSupplyFan) this._refs.supplyFanGroup.classList.add("hidden");
    this._refs.supplyFanUse = svgEl("use", {
      href: `#${this._gid("fan-icon")}`,
      x: "-14", y: "-14", width: "28", height: "28",
    });
    this._refs.supplyFanGroup.appendChild(this._refs.supplyFanUse);
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

    // Exhaust fan group
    this._refs.exhaustFanGroup = svgEl("g", { transform: "translate(372, 190)" });
    if (!hasExhaustFan) this._refs.exhaustFanGroup.classList.add("hidden");
    this._refs.exhaustFanUse = svgEl("use", {
      href: `#${this._gid("fan-icon")}`,
      x: "-14", y: "-14", width: "28", height: "28",
    });
    this._refs.exhaustFanGroup.appendChild(this._refs.exhaustFanUse);
    svg.appendChild(this._refs.exhaustFanGroup);

    this._refs.exhaustFanLabel = svgEl("text", {
      x: "372", y: "218", "text-anchor": "middle",
      fill: "var(--primary-text-color, #333)", "font-size": "10", "font-weight": "600",
    });
    if (!hasExhaustFan) this._refs.exhaustFanLabel.classList.add("hidden");
    svg.appendChild(this._refs.exhaustFanLabel);

    this._refs.exhaustFanRpm = svgEl("text", {
      x: "372", y: "229", "text-anchor": "middle",
      fill: "var(--secondary-text-color, #999)", "font-size": "8",
    });
    svg.appendChild(this._refs.exhaustFanRpm);

    // ── Temperature labels ──
    // T1: Outside air (top-left)
    this._refs.t1Temp = svgEl("text", {
      x: "45", y: "96", "text-anchor": "middle", "font-size": "16", "font-weight": "700",
    });
    svg.appendChild(this._refs.t1Temp);
    svg.appendChild(Object.assign(svgEl("text", {
      x: "45", y: "112", "text-anchor": "middle",
      fill: "var(--secondary-text-color, #999)", "font-size": "9",
    }), { textContent: "Outside" }));

    // T2: Supply to inside (top-right)
    this._refs.t2Temp = svgEl("text", {
      x: "555", y: "96", "text-anchor": "middle", "font-size": "16", "font-weight": "700",
    });
    svg.appendChild(this._refs.t2Temp);
    svg.appendChild(Object.assign(svgEl("text", {
      x: "555", y: "112", "text-anchor": "middle",
      fill: "var(--secondary-text-color, #999)", "font-size": "9",
    }), { textContent: "Supply" }));

    // T3: Extract from inside (bottom-right)
    this._refs.t3Temp = svgEl("text", {
      x: "555", y: "186", "text-anchor": "middle", "font-size": "16", "font-weight": "700",
    });
    svg.appendChild(this._refs.t3Temp);
    svg.appendChild(Object.assign(svgEl("text", {
      x: "555", y: "202", "text-anchor": "middle",
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
    setGrad("exhaust-hx", c3, c4);
    setGrad("exhaust-out", c4, c4);
    setGrad("bypass", c1, c1);

    // ── Bypass ──
    const bypassFraction = bypass !== null ? Math.max(0, Math.min(100, bypass)) / 100 : 0;
    const hxOpacity = 1 - bypassFraction * 0.6;

    // Apply HX opacity to supply and exhaust lines
    for (const line of refs.supplyLines) line.setAttribute("opacity", hxOpacity);
    for (const line of refs.exhaustLines) line.setAttribute("opacity", hxOpacity);

    // Bypass path visibility and color
    const bypassVisible = bypassFraction > 0.01;
    refs.bypassPath.setAttribute("stroke", c1);
    refs.bypassPath.setAttribute("opacity", bypassVisible ? Math.min(1, bypassFraction * 1.2) : "0");
    refs.bypassPath.setAttribute("stroke-dasharray", bypassFraction > 0.9 ? "none" : "8 4");

    // ── Arrows ──
    refs.arrowSupply1.setAttribute("fill", c1);
    refs.arrowSupply2.setAttribute("fill", c2);
    refs.arrowExhaust1.setAttribute("fill", c3);
    refs.arrowExhaust2.setAttribute("fill", c4);

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
          // Negative or >100% efficiency means the calculation is not meaningful
          // (e.g. summer mode, bypass active, or sensor error)
          effText = "Efficiency: N/A";
        } else {
          effText = `Efficiency: ${Math.round(eff)}%`;
        }
      }
    }
    refs.efficiencyText.textContent = effText;

    // Bypass label
    refs.bypassText.textContent = bypass !== null ? `Bypass: ${Math.round(bypass)}%` : "";

    // ── Fan speed labels ──
    const fmtPct = (v) => v !== null ? `${Math.round(v)}%` : "";

    if (cfg.supply_fan_speed) {
      refs.supplyFanLabel.textContent = supplySpeed !== null ? fmtPct(supplySpeed) : "\u2014";
    }
    if (cfg.exhaust_fan_speed) {
      refs.exhaustFanLabel.textContent = exhaustSpeed !== null ? fmtPct(exhaustSpeed) : "\u2014";
    }

    // RPM labels (only if entity configured and has value)
    refs.supplyFanRpm.textContent =
      cfg.supply_fan_rpm && supplyRpm !== null ? `${Math.round(supplyRpm)} RPM` : "";
    refs.exhaustFanRpm.textContent =
      cfg.exhaust_fan_rpm && exhaustRpm !== null ? `${Math.round(exhaustRpm)} RPM` : "";

    // ── Animations ──
    // We use CSS animations via style.animation so they persist across _updateDom calls.
    // Only rebuild the animation string when the computed duration actually changes,
    // to avoid restarting.

    // Supply flow animation
    const supplyAnimDur = supplySpeed && supplySpeed > 0
      ? Math.max(0.5, 4 - (supplySpeed / 100) * 3) : 0;
    if (supplyAnimDur !== this._curSupplyAnimDur) {
      this._curSupplyAnimDur = supplyAnimDur;
      if (supplyAnimDur > 0) {
        refs.supplyAnim.setAttribute("opacity", "0.5");
        this._setSmilAnimation(refs.supplyAnim, "stroke-dashoffset", "0", "-24", supplyAnimDur);
      } else {
        refs.supplyAnim.setAttribute("opacity", "0");
        this._clearSmilAnimation(refs.supplyAnim);
      }
    }

    // Exhaust flow animation
    const exhaustAnimDur = exhaustSpeed && exhaustSpeed > 0
      ? Math.max(0.5, 4 - (exhaustSpeed / 100) * 3) : 0;
    if (exhaustAnimDur !== this._curExhaustAnimDur) {
      this._curExhaustAnimDur = exhaustAnimDur;
      if (exhaustAnimDur > 0) {
        refs.exhaustAnim.setAttribute("opacity", "0.5");
        this._setSmilAnimation(refs.exhaustAnim, "stroke-dashoffset", "0", "24", exhaustAnimDur);
      } else {
        refs.exhaustAnim.setAttribute("opacity", "0");
        this._clearSmilAnimation(refs.exhaustAnim);
      }
    }

    // Bypass flow animation
    const bypassAnimDur = bypassVisible && supplyAnimDur > 0 ? supplyAnimDur : 0;
    refs.bypassAnim.setAttribute("opacity",
      bypassAnimDur > 0 ? Math.min(0.5, bypassFraction * 0.6) : "0");
    if (bypassAnimDur !== this._curBypassAnimDur) {
      this._curBypassAnimDur = bypassAnimDur;
      if (bypassAnimDur > 0) {
        this._setSmilAnimation(refs.bypassAnim, "stroke-dashoffset", "0", "-19", bypassAnimDur);
      } else {
        this._clearSmilAnimation(refs.bypassAnim);
      }
    }

    // Fan icon rotation — use CSS classes for smooth animation
    const supplyFanDur = supplySpeed && supplySpeed > 0
      ? Math.max(0.3, 3 - (supplySpeed / 100) * 2.5) : 0;
    if (supplyFanDur !== this._curSupplyFanDur) {
      this._curSupplyFanDur = supplyFanDur;
      if (supplyFanDur > 0) {
        refs.supplyFanUse.removeAttribute("opacity");
        refs.supplyFanUse.style.animation = `spin-cw ${supplyFanDur}s linear infinite`;
        refs.supplyFanUse.style.transformOrigin = "center";
      } else {
        refs.supplyFanUse.setAttribute("opacity", "0.5");
        refs.supplyFanUse.style.animation = "none";
      }
    }
    refs.supplyFanGroup.setAttribute("color", c1);

    const exhaustFanDur = exhaustSpeed && exhaustSpeed > 0
      ? Math.max(0.3, 3 - (exhaustSpeed / 100) * 2.5) : 0;
    if (exhaustFanDur !== this._curExhaustFanDur) {
      this._curExhaustFanDur = exhaustFanDur;
      if (exhaustFanDur > 0) {
        refs.exhaustFanUse.removeAttribute("opacity");
        refs.exhaustFanUse.style.animation = `spin-ccw ${exhaustFanDur}s linear infinite`;
        refs.exhaustFanUse.style.transformOrigin = "center";
      } else {
        refs.exhaustFanUse.setAttribute("opacity", "0.5");
        refs.exhaustFanUse.style.animation = "none";
      }
    }
    refs.exhaustFanGroup.setAttribute("color", c3);

    // ── Filter status ──
    if (cfg.filter_status && filterStatus) {
      refs.filterStrip.classList.remove("hidden");
      refs.filterValue.textContent = filterStatus;
      const filterColor = filterStatus.toLowerCase() === "full"
        ? "var(--error-color, #db4437)"
        : "var(--success-color, #43a047)";
      refs.filterValue.style.color = filterColor;
    } else {
      refs.filterStrip.classList.add("hidden");
    }
  }

  // ── SMIL animation helpers ──
  // We use SMIL <animate> elements because CSS cannot animate SVG presentation
  // attributes like stroke-dashoffset in all browsers. These helpers add/update
  // SMIL children on the target element only when the duration changes, so the
  // animation persists across _updateDom calls.

  _setSmilAnimation(el, attr, from, to, dur) {
    let anim = el.querySelector("animate");
    if (anim) {
      // Update existing animation only if duration changed
      if (anim.getAttribute("dur") === `${dur}s`) return;
      anim.setAttribute("dur", `${dur}s`);
    } else {
      anim = svgEl("animate", {
        attributeName: attr,
        from: from,
        to: to,
        dur: `${dur}s`,
        repeatCount: "indefinite",
      });
      el.appendChild(anim);
    }
    // Force restart
    if (anim.beginElement) anim.beginElement();
  }

  _clearSmilAnimation(el) {
    const anim = el.querySelector("animate");
    if (anim) {
      anim.remove();
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
