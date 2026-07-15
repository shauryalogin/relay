import { useState, useEffect, useRef } from "react";
import { audioManager } from "../utils/audio.js";

const ICONS = [
  { id: "radio", glyph: "◉", label: "Radio" },
  { id: "lantern", glyph: "◈", label: "Lantern" },
  { id: "compass", glyph: "✛", label: "Compass" },
  { id: "beacon", glyph: "▲", label: "Beacon" },
  { id: "anchor", glyph: "⚓", label: "Anchor" },
  { id: "signal", glyph: "≡", label: "Signal" },
];

export default function JoinScreen({ onJoin, joinError, connected }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("radio");
  const [isTuning, setIsTuning] = useState(false);
  const [tuningProgress, setTuningProgress] = useState(0);
  const [staticLevel, setStaticLevel] = useState(0.85);

  const canvasRef = useRef(null);
  const progressTimerRef = useRef(null);

  useEffect(() => {
    // Trigger initial shortwave tune sweep
    audioManager.playTuneSweep();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    const start = Date.now();
    const duration = 1200; // 1.2 seconds resolving noise

    const draw = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const currentStatic = Math.max(0.85 - progress * 0.83, 0.02);
      setStaticLevel(currentStatic);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (currentStatic > 0.03) {
        // High-efficiency offscreen noise scaler
        const noiseSize = 90;
        const offscreen = document.createElement("canvas");
        offscreen.width = noiseSize;
        offscreen.height = noiseSize;
        const octx = offscreen.getContext("2d");
        const imgData = octx.createImageData(noiseSize, noiseSize);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const val = Math.random() * 255;
          data[i] = val * 0.16;       // R
          data[i + 1] = val * 0.24;   // G (Tactical green tint)
          data[i + 2] = val * 0.18;   // B
          data[i + 3] = val * currentStatic * 0.55;
        }
        octx.putImageData(imgData, 0, 0);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offscreen, 0, 0, w, h);
      }
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  function handleNameChange(e) {
    const uppercaseVal = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    setName(uppercaseVal);
    audioManager.playKeystroke();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isTuning) return;

    setIsTuning(true);
    setTuningProgress(0);
    audioManager.playTuneSweep();

    let prog = 0;
    progressTimerRef.current = setInterval(() => {
      prog += 6;
      if (prog >= 100) {
        clearInterval(progressTimerRef.current);
        setTuningProgress(100);
        setTimeout(() => {
          onJoin(trimmed, icon);
        }, 200);
      } else {
        setTuningProgress(prog);
      }
    }, 50);
  }

  return (
    <div className="join-screen">
      <canvas ref={canvasRef} className="join-bg-static" style={{ pointerEvents: "none", position: "absolute", inset: 0 }} />
      <div className="join-card active-violet" style={{ position: "relative", zIndex: 10, animation: "crt-flicker 0.15s ease-out 1" }}>
        <div className="join-status field-label">
          <span className={`dot ${connected ? "dot-live" : "dot-dead"} ${connected ? "flicker" : ""}`} />
          {connected ? "SYS.OK: RELAY FREQUENCY LOCK" : "SYS.ERR: CONNECTING TO LOCAL RELAY..."}
        </div>

        <h1 className="join-title terminal-cursor" style={{ color: "var(--violet)", textShadow: "var(--glow-violet)" }}>RELAY</h1>
        <p className="join-sub">
          The wider network is offline. This terminal routes packets to other nearby transceivers on this local LAN sector only.
        </p>

        <form onSubmit={handleSubmit} className="join-form">
          <label className="field-label" htmlFor="callsign">
            OPERATOR CALLSIGN [A-Z, 0-9, -]
          </label>
          <input
            id="callsign"
            className="join-input mono"
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. ALPHA-SEC-1"
            maxLength={18}
            autoFocus
            autoComplete="off"
            disabled={isTuning}
          />

          <div className="field-label" style={{ marginTop: "var(--space-4)" }}>
            DEVICE SIGNAL SYMBOL
          </div>
          <div className="icon-grid">
            {ICONS.map((opt) => (
              <button
                type="button"
                key={opt.id}
                className={`icon-choice ${icon === opt.id ? "icon-choice-active" : ""}`}
                onClick={() => {
                  setIcon(opt.id);
                  audioManager.playKeystroke();
                }}
                disabled={isTuning}
                aria-pressed={icon === opt.id}
                aria-label={opt.label}
                title={opt.label}
              >
                <span aria-hidden="true">{opt.glyph}</span>
              </button>
            ))}
          </div>

          {joinError && <div className="join-error">{joinError}</div>}

          {isTuning ? (
            <div className="join-progress-wrap" style={{ marginTop: "var(--space-5)" }}>
              <div className="field-label" style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span>TUNING FREQUENCY...</span>
                <span>{tuningProgress}%</span>
              </div>
              <div className="progress-bar-bg" style={{ height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${tuningProgress}%`, height: "100%", background: "var(--violet)", boxShadow: "var(--glow-violet)", transition: "width 0.05s linear" }} 
                />
              </div>
            </div>
          ) : (
            <button type="submit" className="join-submit active-violet" style={{ background: "var(--violet)", color: "#ffffff" }} disabled={!name.trim() || isTuning}>
              ESTABLISH LINK
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
