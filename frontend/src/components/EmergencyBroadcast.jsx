import { useEffect, useRef, useState } from "react";
import { audioManager } from "../utils/audio.js";
import {
  IconAlertTriangle,
  IconAlertOctagon,
} from "@tabler/icons-react";

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Full-viewport broadcast alert modal that takes over the screen. */
export function BroadcastBanner({ broadcasts, dismissedUpTo, onDismiss }) {
  const latest = broadcasts[broadcasts.length - 1];
  const dismissBtnRef = useRef(null);

  const hasActiveBroadcast = latest && latest.timestamp > dismissedUpTo;

  useEffect(() => {
    if (hasActiveBroadcast) {
      audioManager.startAlarm();
      if (dismissBtnRef.current) dismissBtnRef.current.focus();
    } else {
      audioManager.stopAlarm();
    }
    return () => audioManager.stopAlarm();
  }, [hasActiveBroadcast]);

  if (!hasActiveBroadcast) return null;

  const handleAcknowledge = () => {
    audioManager.stopAlarm();
    onDismiss(latest.timestamp);
  };

  return (
    <div
      className="broadcast-banner"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-title"
      aria-describedby="alert-desc"
    >
      <div className="broadcast-takeover-box alert-shake-active">
        <div className="hazard-stripe-bar" />
        <div className="broadcast-takeover-content">
          <div id="alert-title" className="broadcast-alert-eyebrow" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IconAlertOctagon size={20} style={{ flexShrink: 0 }} />
            SYSTEM EMERGENCY ALERT
          </div>
          <div id="alert-desc" className="broadcast-takeover-text">
            "{latest.text}"
          </div>
          <div className="broadcast-takeover-meta">
            ORIGIN DISPATCH: <span className="mono" style={{ color: "var(--red)", fontWeight: "bold" }}>{latest.from}</span>
            <br />
            TIMESTAMP: <span className="mono">{formatTime(latest.timestamp)} LOCAL</span>
          </div>
          <button
            ref={dismissBtnRef}
            className="broadcast-takeover-dismiss"
            onClick={handleAcknowledge}
          >
            ACKNOWLEDGE ALERT
          </button>
        </div>
        <div className="hazard-stripe-bar" />
      </div>
    </div>
  );
}

/** One-tap trigger + confirmation composer, kept deliberately hard to hit by accident. */
export function BroadcastComposer({ onSend }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  function handleTriggerClick() {
    audioManager.playKeystroke();
    setOpen(true);
  }

  function handleCancelClick() {
    audioManager.playKeystroke();
    setOpen(false);
  }

  function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    audioManager.playLock();
    onSend(trimmed);
    setText("");
    setOpen(false);
  }

  return (
    <>
      <button className="broadcast-trigger" onClick={handleTriggerClick}>
        <IconAlertTriangle size={16} aria-hidden="true" />

      </button>

      {open && (
        <div className="broadcast-modal-backdrop" role="dialog" aria-modal="true" aria-label="Send emergency broadcast">
          <form className="broadcast-modal active-red" onSubmit={handleSend}>
            <div className="field-label" style={{ color: "var(--red)", display: "flex", alignItems: "center", gap: "6px" }}>
              <IconAlertTriangle size={14} />
              EMERGENCY TRANSMITTER WARNING
            </div>
            <h3 className="broadcast-modal-title">Broadcast message to all nodes</h3>
            <textarea
              className="broadcast-textarea"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter critical instructions (e.g. muster points, safety updates)..."
              maxLength={280}
              rows={3}
            />
            <div className="broadcast-modal-actions">
              <button type="button" className="broadcast-cancel" onClick={handleCancelClick}>
                Cancel
              </button>
              <button type="submit" className="broadcast-confirm" disabled={!text.trim()}>
                SEND BROADCAST
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
