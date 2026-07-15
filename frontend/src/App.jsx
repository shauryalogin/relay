import { useMemo, useState, useEffect } from "react";
import { useSocket } from "./hooks/useSocket.js";
import JoinScreen from "./components/JoinScreen.jsx";
import ChatWindow from "./components/ChatWindow.jsx";
import NeedsBoard from "./components/NeedsBoard.jsx";
import NetworkMap from "./components/NetworkMap.jsx";
import { BroadcastBanner, BroadcastComposer } from "./components/EmergencyBroadcast.jsx";
import { audioManager } from "./utils/audio.js";
import { FloatingNav } from "./components/ui/floating-navbar.tsx";
import { TransceiverDashboard } from "./components/ui/resizable-navbar.tsx";
import { FloatingDock } from "./components/ui/floating-dock.tsx";
import {
  IconRadio,
  IconMap2,
  IconClipboardList,
  IconUsers,
  IconVolume,
  IconVolumeOff,
  IconChevronRight,
} from "@tabler/icons-react";
import "./app.css";

const SIGNAL_LABEL = {
  strong: "Relay link stable",
  weak: "Relay link degraded — retrying",
  offline: "Relay unreachable",
};

export default function App() {
  const {
    connected,
    signal,
    self,
    joinError,
    peers,
    channelMessages,
    directMessages,
    broadcasts,
    board,
    join,
    sendChannelMessage,
    sendDirectMessage,
    sendBroadcast,
    postBoard,
    resolveBoard,
  } = useSocket();

  const [view, setView] = useState("channel");
  const [activePeer, setActivePeer] = useState(null);
  const [dismissedUpTo, setDismissedUpTo] = useState(0);
  const [peersOpen, setPeersOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [muted, setMuted] = useState(false);

  // Transceiver control states
  const [frequency, setFrequency] = useState(144.800);
  const [operatorPanelOpen, setOperatorPanelOpen] = useState(false);
  const [pingActive, setPingActive] = useState(false);
  const [pingLog, setPingLog] = useState([
    `[${new Date().toLocaleTimeString()}] TRANSCEIVER ACTIVE - SCANNING BAND...`,
    `[${new Date().toLocaleTimeString()}] LOCK ESTABLISHED ON 144.800 MHz`
  ]);

  const triggerDiagnosticsPing = () => {
    if (pingActive) return;
    setPingActive(true);
    if (audioManager && audioManager.playLock) {
      audioManager.playLock();
    }
    setPingLog(prev => [`[${new Date().toLocaleTimeString()}] Sonar ping dispatched...`, ...prev]);
    setTimeout(() => {
      setPingLog(prev => [
        `[${new Date().toLocaleTimeString()}] Sonar response received — OK`,
        `[${new Date().toLocaleTimeString()}] Health: 99% — Sector LAN Sector 4`,
        ...prev
      ]);
      setPingActive(false);
    }, 1000);
  };

  useEffect(() => {
    const uptimeTimer = setInterval(() => setUptime((u) => u + 1), 1000);
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(uptimeTimer);
      clearInterval(clockTimer);
    };
  }, []);

  const activePeerStatus = useMemo(
    () => peers.find((p) => p.username === activePeer)?.status,
    [peers, activePeer]
  );

  const others = peers.filter((p) => p.username !== self?.username);
  const onlineCount = others.filter((p) => p.status === "online").length;

  if (!self) {
    return <JoinScreen onJoin={join} joinError={joinError} connected={connected} />;
  }

  function toggleMute() {
    const nextMuted = !muted;
    setMuted(nextMuted);
    audioManager.setMuted(nextMuted);
  }

  function formatUptime(secs) {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function openPeer(username) {
    setActivePeer(username);
    setView("dm");
    setPeersOpen(false);
  }

  // Nav items for the resizable navbar
  const navItems = [
    { name: "CHANNEL", link: "#", onClick: (e) => { e.preventDefault(); audioManager.playKeystroke(); setView("channel"); }, active: view === "channel" },
    { name: "MAP", link: "#", onClick: (e) => { e.preventDefault(); audioManager.playKeystroke(); setView("map"); }, active: view === "map" },
    { name: "BOARD", link: "#", onClick: (e) => { e.preventDefault(); audioManager.playKeystroke(); setView("board"); }, active: view === "board" },
  ];

  // Items for the floating left dock
  const dockItems = [
    {
      title: "Network Channel",
      icon: <IconRadio size="100%" />,
      onClick: () => { audioManager.playKeystroke(); setView("channel"); },
      active: view === "channel",
    },
    {
      title: "Network Map",
      icon: <IconMap2 size="100%" />,
      onClick: () => { audioManager.playKeystroke(); setView("map"); },
      active: view === "map",
    },
    {
      title: "Needs Board",
      icon: <IconClipboardList size="100%" />,
      onClick: () => { audioManager.playKeystroke(); setView("board"); },
      active: view === "board",
    },
    {
      title: `Peers (${onlineCount} online)`,
      icon: <IconUsers size="100%" />,
      onClick: () => { audioManager.playKeystroke(); setPeersOpen((v) => !v); },
      active: peersOpen,
      badge: onlineCount > 0 ? onlineCount : undefined,
    },
    {
      title: muted ? "Unmute Audio" : "Mute Audio",
      icon: muted ? <IconVolumeOff size="100%" /> : <IconVolume size="100%" />,
      onClick: toggleMute,
      active: false,
    },
  ];

  return (
    <div className="app-shell crt-active" style={{ paddingTop: "60px" }}>
      <div className="crt-overlay" />
      <BroadcastBanner broadcasts={broadcasts} dismissedUpTo={dismissedUpTo} onDismiss={setDismissedUpTo} />

      {/* ── Floating Navbar ── */}
      <FloatingNav
        navItems={navItems}
        rightSlot={
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 6px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
              <span
                style={{ color: "var(--teal)", cursor: "pointer", letterSpacing: "0.08em" }}
                onClick={() => { audioManager.playKeystroke(); setOperatorPanelOpen((p) => !p); }}
              >
                {frequency.toFixed(3)}<span style={{ color: "var(--text-faint)", marginLeft: "2px" }}>MHz</span>
              </span>
              <span style={{ color: "var(--text-faint)", letterSpacing: "0.06em" }}>{formatUptime(uptime)}</span>
            </div>
            <SignalIndicator signal={signal} />
            <div
              style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}
              onClick={() => { audioManager.playKeystroke(); setOperatorPanelOpen((p) => !p); }}
            >
              <span
                style={{
                  width: "7px", height: "7px", borderRadius: "50%",
                  background: connected ? "var(--teal)" : signal === "weak" ? "var(--amber)" : "var(--red)",
                  boxShadow: connected ? "0 0 6px var(--teal)" : "none",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-dim)", letterSpacing: "0.08em" }}>
                {self.username}
              </span>
            </div>
          </div>
        }
      />

      {/* Transceiver control dashboard (opened from navbar) */}
      <TransceiverDashboard
        open={operatorPanelOpen}
        frequency={frequency}
        onFrequencyChange={(val) => {
          setFrequency(val);
          if (audioManager && audioManager.playTuneSweep) audioManager.playTuneSweep();
        }}
        pingActive={pingActive}
        onTriggerPing={triggerDiagnosticsPing}
        pingLog={pingLog}
        onlineCount={onlineCount}
        signal={signal}
        connected={connected}
      />

      {/* ── Floating left dock (desktop) + FAB (mobile) ── */}
      <FloatingDock items={dockItems} />

      {/* ── Peers side panel (slides in from dock) ── */}
      {peersOpen && (
        <div
          style={{
            position: "fixed",
            left: "76px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 40,
            width: "220px",
            background: "rgba(13,18,28,0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(34,211,238,0.15)",
            borderRadius: "12px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,211,238,0.06)",
            animation: "bubble-slide-in 0.2s cubic-bezier(0.16,1,0.3,1)",
            maxHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Panel header */}
          <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="field-label" style={{ color: "var(--teal)", fontSize: "9px", letterSpacing: "0.16em" }}>
              PEERS — {onlineCount} ONLINE
            </span>
            <button onClick={() => setPeersOpen(false)} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", lineHeight: 1 }}>
              <IconChevronRight size={14} />
            </button>
          </div>
          {/* Peer list */}
          <div style={{ overflowY: "auto", padding: "6px 0" }}>
            {others.length === 0 ? (
              <div style={{ color: "var(--text-faint)", fontSize: "12px", padding: "16px 14px", fontFamily: "var(--font-mono)" }}>
                No peers detected yet.
              </div>
            ) : (
              others.map((peer) => {
                const isOnline = peer.status === "online";
                const isDM = view === "dm" && activePeer === peer.username;
                return (
                  <button
                    key={peer.username}
                    onClick={() => openPeer(peer.username)}
                    style={{
                      width: "100%",
                      background: isDM ? "rgba(34,211,238,0.08)" : "none",
                      border: "none",
                      borderLeft: isDM ? "2px solid var(--teal)" : "2px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 14px",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
                        background: isOnline ? "var(--teal)" : "var(--text-faint)",
                        boxShadow: isOnline ? "var(--glow-teal)" : "none",
                      }}
                    />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: isDM ? "var(--teal)" : isOnline ? "var(--text)" : "var(--text-faint)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {peer.username}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--text-faint)", flexShrink: 0 }}>
                      {isOnline ? "●" : "○"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Main content area ── */}
      <main
        className="app-main"
        style={{
          marginLeft: "72px",
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {view === "channel" && (
          <ChatWindow
            title="Network Channel"
            subtitle="Everyone on this relay sees this"
            messages={channelMessages}
            self={self}
            onSend={sendChannelMessage}
            placeholder="Message the whole network…"
          />
        )}

        {view === "dm" && activePeer && (
          <ChatWindow
            title={activePeer}
            subtitle={activePeerStatus === "online" ? "Direct — online now" : "Direct — will relay on reconnect"}
            messages={directMessages[activePeer] || []}
            self={self}
            onSend={(text) => sendDirectMessage(activePeer, text)}
            placeholder={`Message ${activePeer}…`}
            peerOnline={activePeerStatus === "online"}
          />
        )}

        {view === "board" && (
          <NeedsBoard board={board} self={self} onPost={postBoard} onResolve={resolveBoard} />
        )}

        {view === "map" && <NetworkMap peers={peers} self={self} onSelectPeer={openPeer} />}
      </main>

      <BroadcastComposer onSend={sendBroadcast} />
    </div>
  );
}

function SignalIndicator({ signal }) {
  const bars = signal === "strong" ? 3 : signal === "weak" ? 1 : 0;
  return (
    <div className="signal-indicator" title={SIGNAL_LABEL[signal]}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`signal-bar ${i <= bars ? "signal-bar-active" : ""}`}
          style={{ height: `${i * 4 + 4}px` }}
        />
      ))}
    </div>
  );
}
