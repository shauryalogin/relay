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

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const progressTimerRef = useRef(null);

  // Handle 3D Parallax and Cursor Tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const { width, height, left, top } = container.getBoundingClientRect();

      // Calculate relative position (-0.5 to 0.5)
      const x = (clientX - left) / width - 0.5;
      const y = (clientY - top) / height - 0.5;

      // Max tilt degrees
      const tiltX = y * -20;
      const tiltY = x * 20;

      container.style.setProperty("--mouse-x", `${clientX}px`);
      container.style.setProperty("--mouse-y", `${clientY}px`);
      container.style.setProperty("--tilt-x", `${tiltX}deg`);
      container.style.setProperty("--tilt-y", `${tiltY}deg`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Handle Static Canvas Effect
  useEffect(() => {
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
    const duration = 1200;

    const draw = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const currentStatic = Math.max(0.85 - progress * 0.83, 0.02);
      setStaticLevel(currentStatic);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (currentStatic > 0.03) {
        const noiseSize = 90;
        const offscreen = document.createElement("canvas");
        offscreen.width = noiseSize;
        offscreen.height = noiseSize;
        const octx = offscreen.getContext("2d");
        const imgData = octx.createImageData(noiseSize, noiseSize);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const val = Math.random() * 255;
          data[i] = val * 0.16;
          data[i + 1] = val * 0.24;
          data[i + 2] = val * 0.18;
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
    <div
      className="join-screen enhanced-container"
      ref={containerRef}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        cursor: "none" // Hides default OS cursor
      }}
    >
      {/* Dynamic Inline Styles for New Effects */}
      <style>{`
        .enhanced-container * {
          cursor: none !important; /* Force hide cursor on children */
        }
        
        /* Cursor Glow Overlay */
        .cursor-glow {
          position: absolute;
          top: 0; left: 0;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(138,43,226,0.15) 0%, rgba(0,0,0,0) 70%);
          transform: translate(calc(var(--mouse-x) - 300px), calc(var(--mouse-y) - 300px));
          pointer-events: none;
          z-index: 5;
          mix-blend-mode: screen;
          transition: transform 0.1s cubic-bezier(0.17, 0.67, 0.83, 0.67);
        }

        /* Custom Crosshair Cursor */
        .custom-cursor {
          position: fixed;
          top: 0; left: 0;
          width: 20px;
          height: 20px;
          border: 1px solid var(--violet, #8a2be2);
          border-radius: 50%;
          transform: translate(calc(var(--mouse-x) - 10px), calc(var(--mouse-y) - 10px));
          pointer-events: none;
          z-index: 9999;
          box-shadow: 0 0 10px var(--violet, #8a2be2);
          transition: transform 0.05s linear;
        }
        
        .custom-cursor::after {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          width: 4px; height: 4px;
          background: #fff;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }

        /* 3D Card Animation wrapper */
        .card-3d-wrapper {
          position: relative;
          z-index: 10;
          perspective: 1000px;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
        }

        .card-3d-inner {
          transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
          transform-style: preserve-3d;
          transition: transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          /* Pushes elements out in Z-space slightly for depth */
          box-shadow: -20px 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(138,43,226,0.2);
        }
        
        .card-3d-inner > * {
          transform: translateZ(30px);
        }
      `}</style>

      {/* Backgrounds */}
      <canvas ref={canvasRef} className="join-bg-static" style={{ pointerEvents: "none", position: "absolute", inset: 0, zIndex: 1 }} />
      <div className="cursor-glow" />
      <div className="custom-cursor" />

      {/* 3D Wrapper */}
      <div className="card-3d-wrapper">
        <div
          className="join-card active-violet card-3d-inner"
          style={{ animation: "crt-flicker 0.15s ease-out 1" }}
        >
          <div className="join-status field-label">
            <span className={`dot ${connected ? "dot-live" : "dot-dead"} ${connected ? "flicker" : ""}`} />
            {connected ? "SYS.OK: RELAY FREQUENCY LOCK" : "SYS.ERR: CONNECTING TO LOCAL RELAY..."}
          </div>

          <h1 className="join-title terminal-cursor" style={{ color: "var(--violet, #8a2be2)", textShadow: "var(--glow-violet, 0 0 10px #8a2be2)" }}>RELAY</h1>
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

            <div className="field-label" style={{ marginTop: "var(--space-4, 16px)" }}>
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
              <div className="join-progress-wrap" style={{ marginTop: "var(--space-5, 24px)" }}>
                <div className="field-label" style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>TUNING FREQUENCY...</span>
                  <span>{tuningProgress}%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: "6px", background: "var(--border, #333)", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${tuningProgress}%`, height: "100%", background: "var(--violet, #8a2be2)", boxShadow: "var(--glow-violet, 0 0 10px #8a2be2)", transition: "width 0.05s linear" }}
                  />
                </div>
              </div>
            ) : (
              <button type="submit" className="join-submit active-violet" style={{ background: "var(--violet, #8a2be2)", color: "#ffffff", marginTop: "1rem" }} disabled={!name.trim() || isTuning}>
                ESTABLISH LINK
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}