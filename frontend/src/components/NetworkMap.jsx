import { useState, useEffect, useRef } from "react";
import { audioManager } from "../utils/audio.js";
import { IconRadio } from "@tabler/icons-react";

const ICON_GLYPHS = {
  radio: "◉",
  lantern: "◈",
  compass: "✛",
  beacon: "▲",
  anchor: "⚓",
  signal: "≡",
};

const DEVICE_LABELS = {
  radio: "Portable Field Radio Set",
  lantern: "Emergency Beacon Unit",
  compass: "Tactical Direction Finder",
  beacon: "Static Repeater Node",
  anchor: "Command Base Transceiver",
  signal: "Mesh Auxiliary Relayer",
};

// Generate a dotted matrix grid as an SVG pattern
function DotMatrix({ width, height, dotSpacing = 18, dotRadius = 0.9, color = "rgba(34,211,238,0.12)" }) {
  const cols = Math.ceil(width / dotSpacing);
  const rows = Math.ceil(height / dotSpacing);
  const dots = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      dots.push(
        <circle
          key={`${r}-${c}`}
          cx={c * dotSpacing}
          cy={r * dotSpacing}
          r={dotRadius}
          fill={color}
        />
      );
    }
  }
  return <g aria-hidden="true">{dots}</g>;
}

// Quadratic Bezier curved path between hub (center) and a node
// with a control point that arcs upward relative to the midpoint
function getCurvedPath(x1, y1, x2, y2) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  // Pull control point toward center with an outward bias
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  // Perpendicular offset: arc away from straight line
  const offsetAmt = len * 0.22;
  const perpX = -dy / len;
  const perpY = dx / len;
  const cpx = midX + perpX * offsetAmt;
  const cpy = midY + perpY * offsetAmt;
  return `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;
}

// Pathlen approximation for stroke-dashoffset animation
function pathLength(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 1.18;
}

export default function NetworkMap({ peers, self, onSelectPeer }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [tick, setTick] = useState(0);

  // Tick to cycle packet offset for marching-ants effect
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  const others = peers.filter((p) => p.username !== self?.username);
  const nodes = [
    { username: self?.username, deviceIcon: self?.deviceIcon, status: "online", isSelf: true },
    ...others,
  ];

  const size = 500;
  const center = size / 2;
  const radius = size * 0.36;

  const positioned = nodes.map((n, i) => {
    const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { ...n, x, y };
  });

  const onlineCount = others.filter((p) => p.status === "online").length;

  const handleNodeClick = (node) => {
    audioManager.playKeystroke();
    setSelectedNode(node);
  };

  return (
    <section className="map-view" aria-label="Network map">
      <header className="chat-header">
        <div>
          <h2 className="chat-title">Network Map</h2>
          <div className="chat-subtitle field-label">
            {onlineCount} of {others.length} peers reachable ·{" "}
            <span style={{ color: "var(--teal)" }}>HUB RELAY ACTIVE</span>
          </div>
        </div>
        <div className="field-label mono" style={{ fontSize: "10px", color: "var(--text-faint)", textAlign: "right" }}>
          <div>FREQ: 2.4 GHz [LOCK]</div>
          <div style={{ color: "var(--teal)", textShadow: "var(--glow-teal)" }}>● SIG: STRONG</div>
        </div>
      </header>

      <div className="map-canvas-wrap" style={{ position: "relative", background: "var(--bg)" }}>
        {/* Corner telemetry labels */}
        <div className="field-label mono" style={{ position: "absolute", top: "10px", left: "14px", color: "var(--text-faint)", fontSize: "9px", letterSpacing: "0.12em", zIndex: 2 }}>
          GRID: 45°N // SECTOR: LOCAL
        </div>
        <div className="field-label mono" style={{ position: "absolute", top: "10px", right: "14px", color: "var(--text-faint)", fontSize: "9px", letterSpacing: "0.12em", zIndex: 2 }}>
          RADAR: {size}×{size}px
        </div>

        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="map-svg"
          role="img"
          aria-label="Hub topology of devices connected through this local relay"
          style={{ display: "block" }}
        >
          <defs>
            {/* Teal radial sweep gradient */}
            <radialGradient id="sweepFade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--teal)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--teal)" stopOpacity="0" />
            </radialGradient>

            {/* Glow filter for selected nodes */}
            <filter id="glowFilter" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Violet glow for self */}
            <filter id="violetGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feFlood floodColor="var(--violet)" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="SourceGraphic" operator="in" result="glow" />
              <feGaussianBlur in="glow" stdDeviation="5" result="blurred" />
              <feMerge>
                <feMergeNode in="blurred" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Cyan glow for online peers */}
            <filter id="cyanGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feFlood floodColor="var(--teal)" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="SourceGraphic" operator="in" result="glow" />
              <feGaussianBlur in="glow" stdDeviation="4" result="blurred" />
              <feMerge>
                <feMergeNode in="blurred" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Path gradient — teal flow packet */}
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--teal)" stopOpacity="0" />
              <stop offset="15%" stopColor="var(--teal)" stopOpacity="1" />
              <stop offset="85%" stopColor="var(--teal)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--teal)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ── Dotted matrix grid background ── */}
          <DotMatrix width={size} height={size} dotSpacing={20} dotRadius={0.85} color="rgba(34,211,238,0.1)" />

          {/* ── Radar range rings ── */}
          {[0.3, 0.52, 0.74, 0.96].map((f, i) => (
            <circle
              key={`ring-${i}`}
              cx={center}
              cy={center}
              r={radius * f + size * 0.03}
              fill="none"
              stroke={i === 3 ? "rgba(34,211,238,0.18)" : "rgba(34,211,238,0.07)"}
              strokeWidth={i === 3 ? "1.5" : "0.8"}
              strokeDasharray={i % 2 === 1 ? "4 8" : "none"}
            />
          ))}

          {/* ── Crosshair lines ── */}
          <line x1={center} y1={center - radius - 36} x2={center} y2={center + radius + 36}
            stroke="rgba(34,211,238,0.08)" strokeWidth="1" strokeDasharray="3 5" />
          <line x1={center - radius - 36} y1={center} x2={center + radius + 36} y2={center}
            stroke="rgba(34,211,238,0.08)" strokeWidth="1" strokeDasharray="3 5" />

          {/* ── Radar sweep ── */}
          <g className="map-sweep" style={{ transformOrigin: `${center}px ${center}px` }}>
            <path
              d={`M ${center} ${center} L ${center} ${center - radius - 36}
                  A ${radius + 36} ${radius + 36} 0 0 1
                  ${center + (radius + 36) * Math.sin(0.38)}
                  ${center - (radius + 36) * Math.cos(0.38)} Z`}
              fill="url(#sweepFade)"
            />
          </g>

          {/* ── Curved connection paths ── */}
          {positioned.filter(n => !n.isSelf).map((n) => {
            const path = getCurvedPath(center, center, n.x, n.y);
            const pLen = pathLength(center, center, n.x, n.y);
            const isOnline = n.status === "online";
            // Packet offset: marching ants travelling hub→node
            const dashLen = 14;
            const gapLen = pLen - dashLen;
            const offset = -((tick * 2) % (dashLen + gapLen));

            return (
              <g key={`conn-${n.username}`}>
                {/* Faint background trace */}
                <path
                  d={path}
                  fill="none"
                  stroke={isOnline ? "rgba(34,211,238,0.18)" : "rgba(71,85,105,0.25)"}
                  strokeWidth="1.5"
                  strokeDasharray={!isOnline ? "2 4" : "none"}
                />
                {/* Animated packet flow — only for online nodes */}
                {isOnline && (
                  <path
                    d={path}
                    fill="none"
                    stroke="var(--teal)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={`${dashLen} ${gapLen}`}
                    strokeDashoffset={offset}
                    style={{ filter: "drop-shadow(0 0 3px var(--teal))", opacity: 0.85 }}
                  />
                )}
              </g>
            );
          })}

          {/* ── Hub relay node ── */}
          <g style={{ cursor: "crosshair" }}>
            {/* Outer dashed orbit ring */}
            <circle
              cx={center} cy={center} r={28}
              fill="none" stroke="var(--amber)"
              strokeWidth="1" strokeDasharray="3 3"
              strokeOpacity="0.45"
              style={{ animation: "map-rotate 12s linear infinite reverse", transformOrigin: `${center}px ${center}px` }}
            />
            {/* Hub body */}
            <circle
              cx={center} cy={center} r={16}
              fill="var(--bg-panel)"
              stroke="var(--amber)"
              strokeWidth="2.5"
              style={{ filter: "drop-shadow(0 0 6px rgba(245,166,35,0.5))" }}
            />
            <text
              x={center} y={center + 4}
              textAnchor="middle"
              fill="var(--amber)"
              style={{ fontSize: "8px", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", fontWeight: "bold" }}
              aria-hidden="true"
            >
              HUB
            </text>
            <text
              x={center} y={center + 33}
              textAnchor="middle"
              fill="var(--amber)"
              style={{ fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textShadow: "var(--glow-amber)", opacity: 0.8 }}
            >
              RELAY.SRV
            </text>
          </g>

          {/* ── Device nodes ── */}
          {positioned.map((n) => {
            const isOnline = n.status === "online";
            const isSelected = selectedNode?.username === n.username;

            // Colour logic: violet for self, teal for online, slate for offline
            const nodeColor = n.isSelf
              ? "var(--violet)"
              : isOnline
                ? "var(--teal)"
                : "var(--text-faint)";

            const glowFilter = n.isSelf
              ? "url(#violetGlow)"
              : isOnline
                ? "url(#cyanGlow)"
                : "none";

            const nodeR = n.isSelf ? 16 : 13;

            return (
              <g
                key={n.username}
                transform={`translate(${n.x}, ${n.y})`}
                onClick={() => handleNodeClick(n)}
                style={{ cursor: "pointer" }}
                role="button"
                aria-label={`${n.username} — ${n.status}`}
              >
                {/* Expanding ping ring — online nodes only */}
                {isOnline && (
                  <>
                    <circle r={nodeR + 6} fill="none" stroke={nodeColor} strokeWidth="1" opacity="0.3">
                      <animate attributeName="r" from={nodeR + 2} to={nodeR + 18} dur="2s" begin="0s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.4" to="0" dur="2s" begin="0s" repeatCount="indefinite" />
                    </circle>
                    <circle r={nodeR + 6} fill="none" stroke={nodeColor} strokeWidth="0.8" opacity="0.2">
                      <animate attributeName="r" from={nodeR + 2} to={nodeR + 26} dur="2s" begin="0.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.3" to="0" dur="2s" begin="0.6s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}

                {/* Selection highlight ring */}
                {isSelected && (
                  <circle
                    r={nodeR + 7}
                    fill="none"
                    stroke={n.isSelf ? "var(--violet)" : "var(--teal)"}
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    opacity="0.8"
                    style={{ animation: "map-rotate 4s linear infinite", transformOrigin: "center" }}
                  />
                )}

                {/* Node body */}
                <circle
                  r={nodeR}
                  fill="var(--bg-panel)"
                  stroke={isSelected ? "white" : nodeColor}
                  strokeWidth={isSelected ? "2.5" : "2"}
                  filter={glowFilter}
                />

                {/* Glyph icon */}
                <text
                  textAnchor="middle"
                  dy="4"
                  fill={nodeColor}
                  style={{
                    fontSize: n.isSelf ? "13px" : "11px",
                    fontFamily: "var(--font-body)",
                    pointerEvents: "none",
                    textShadow: n.isSelf ? "var(--glow-violet)" : isOnline ? "var(--glow-teal)" : "none",
                  }}
                  aria-hidden="true"
                >
                  {ICON_GLYPHS[n.deviceIcon] || "◉"}
                </text>

                {/* Node label */}
                <text
                  textAnchor="middle"
                  y={nodeR + 16}
                  fill={isSelected ? "white" : (n.isSelf ? "var(--violet)" : isOnline ? "var(--text)" : "var(--text-faint)")}
                  style={{
                    fontSize: "9px",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.08em",
                    fontWeight: isSelected || n.isSelf ? "bold" : "normal",
                  }}
                >
                  {n.isSelf ? `${n.username}` : n.username}
                </text>
                {n.isSelf && (
                  <text
                    textAnchor="middle"
                    y={nodeR + 27}
                    fill="var(--violet)"
                    style={{ fontSize: "8px", fontFamily: "var(--font-mono)", opacity: 0.7, letterSpacing: "0.06em" }}
                  >
                    YOU
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* ── Node detail card ── */}
        {selectedNode && (
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "12px",
              right: "12px",
              background: "var(--bg-panel)",
              border: `1px solid ${selectedNode.isSelf ? "var(--violet)" : selectedNode.status === "online" ? "var(--teal)" : "var(--border)"}`,
              borderRadius: "6px",
              padding: "14px 16px",
              boxShadow: selectedNode.isSelf
                ? "0 4px 24px rgba(139,92,246,0.25)"
                : selectedNode.status === "online"
                  ? "0 4px 24px rgba(34,211,238,0.2)"
                  : "0 4px 16px rgba(0,0,0,0.4)",
              animation: "bubble-slide-in 0.2s cubic-bezier(0.16,1,0.3,1)",
              zIndex: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <div>
                <div
                  className="field-label"
                  style={{ fontSize: "9px", color: "var(--text-faint)", marginBottom: "3px" }}
                >
                  CALLSIGN DIRECTORY
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: selectedNode.isSelf ? "var(--violet)" : selectedNode.status === "online" ? "var(--teal)" : "var(--text-faint)",
                      boxShadow: selectedNode.isSelf ? "var(--glow-violet)" : selectedNode.status === "online" ? "var(--glow-teal)" : "none",
                      display: "inline-block", flexShrink: 0,
                    }}
                  />
                  <h4 className="mono" style={{ margin: 0, fontSize: "15px", color: "var(--text)", fontWeight: "bold" }}>
                    {selectedNode.username}
                    {selectedNode.isSelf && (
                      <span style={{ color: "var(--violet)", fontSize: "10px", marginLeft: "6px" }}>— YOU</span>
                    )}
                  </h4>
                </div>
              </div>
              <button
                onClick={() => { audioManager.playKeystroke(); setSelectedNode(null); }}
                style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: "16px", padding: "0 4px", lineHeight: 1, cursor: "pointer" }}
                aria-label="Close node details"
              >
                ✕
              </button>
            </div>

            <div
              className="mono"
              style={{
                fontSize: "11px", color: "var(--text-dim)",
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "5px 12px", marginBottom: "12px",
              }}
            >
              <div>
                <span style={{ color: "var(--text-faint)" }}>STATUS: </span>
                <span style={{
                  color: selectedNode.isSelf ? "var(--violet)" : selectedNode.status === "online" ? "var(--teal)" : "var(--text-faint)",
                  fontWeight: "bold",
                }}>
                  {selectedNode.isSelf ? "ACTIVE" : selectedNode.status.toUpperCase()}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-faint)" }}>DEVICE: </span>
                {DEVICE_LABELS[selectedNode.deviceIcon] || "Unknown"}
              </div>
              <div>
                <span style={{ color: "var(--text-faint)" }}>LAST RX: </span>
                {selectedNode.isSelf
                  ? "CONTINUOUS"
                  : selectedNode.status === "online"
                    ? "NOW"
                    : selectedNode.lastSeen
                      ? new Date(selectedNode.lastSeen * 1000).toLocaleTimeString()
                      : "—"}
              </div>
              <div>
                <span style={{ color: "var(--text-faint)" }}>SECTOR: </span>
                LAN MESH
              </div>
            </div>

            {!selectedNode.isSelf && (
              <button
                onClick={() => { audioManager.playLock(); onSelectPeer(selectedNode.username); }}
                style={{
                  width: "100%",
                  minHeight: "38px",
                  background: selectedNode.status === "online" ? "var(--teal-dim)" : "var(--bg-raised)",
                  color: selectedNode.status === "online" ? "var(--bg)" : "var(--text-dim)",
                  border: selectedNode.status === "online" ? "none" : "1px dashed var(--border)",
                  borderRadius: "4px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  fontWeight: "bold",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                }}
              >
                <IconRadio size={15} /> SEND DIRECT PACKET
              </button>
            )}
          </div>
        )}
      </div>

      <p className="map-footnote field-label" style={{ color: "var(--text-faint)" }}>
        Hub topology — all connections route through the relay server node.
      </p>
    </section>
  );
}
