import { audioManager } from "../utils/audio.js";
import {
  IconRadio,
  IconBroadcast,
  IconCompass,
  IconAnchor,
  IconWifi,
  IconBulb,
  IconMessage,
  IconMap2,
  IconClipboardList,
} from "@tabler/icons-react";

// Map device icon IDs to Tabler icon components
const DEVICE_ICONS = {
  radio: IconRadio,
  lantern: IconBulb,
  compass: IconCompass,
  beacon: IconBroadcast,
  anchor: IconAnchor,
  signal: IconWifi,
};

function timeAgo(ts) {
  if (!ts) return "never";
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PeerList({
  peers,
  self,
  activeView,
  activePeer,
  onSelectChannel,
  onSelectPeer,
  onSelectBoard,
  onSelectMap,
  unreadPeers,
}) {
  const others = peers.filter((p) => p.username !== self?.username);
  const onlineCount = others.filter((p) => p.status === "online").length;

  const handleNavClick = (callback) => {
    audioManager.playKeystroke();
    callback();
  };

  return (
    <nav className="peer-list" aria-label="Network navigation">
      <div className="peer-list-section">
        <button
          className={`nav-row ${activeView === "channel" ? "nav-row-active active-teal" : ""}`}
          onClick={() => handleNavClick(onSelectChannel)}
        >
          <span className="nav-row-glyph" aria-hidden="true">
            <IconMessage size={15} />
          </span>
          <span>Network Channel</span>
        </button>
        <button
          className={`nav-row ${activeView === "board" ? "nav-row-active active-teal" : ""}`}
          onClick={() => handleNavClick(onSelectBoard)}
        >
          <span className="nav-row-glyph" aria-hidden="true">
            <IconClipboardList size={15} />
          </span>
          <span>Needs &amp; Resources</span>
        </button>
        <button
          className={`nav-row ${activeView === "map" ? "nav-row-active active-teal" : ""}`}
          onClick={() => handleNavClick(onSelectMap)}
        >
          <span className="nav-row-glyph" aria-hidden="true">
            <IconMap2 size={15} />
          </span>
          <span>Network Map</span>
        </button>
      </div>

      <div className="peer-list-divider">
        <span className="field-label">Reachable peers — {onlineCount} online</span>
      </div>

      <div className="peer-list-scroll">
        {others.length === 0 && (
          <div className="peer-empty">No other devices detected on this network yet.</div>
        )}
        {others.map((peer) => {
          const justOffline =
            peer.status === "offline" &&
            peer.lastSeen &&
            Date.now() / 1000 - peer.lastSeen < 30;
          const dotClass =
            peer.status === "online"
              ? "status-online"
              : justOffline
              ? "status-just-offline"
              : "status-offline";

          const DeviceIcon = DEVICE_ICONS[peer.deviceIcon] || IconRadio;

          return (
            <button
              key={peer.username}
              className={`peer-row ${
                activeView === "dm" && activePeer === peer.username
                  ? "nav-row-active active-teal"
                  : ""
              }`}
              onClick={() => handleNavClick(() => onSelectPeer(peer.username))}
            >
              <span className={`status-dot ${dotClass}`} />
              <span className="peer-row-glyph" aria-hidden="true">
                <DeviceIcon size={14} />
              </span>
              <span className="peer-row-name">{peer.username}</span>
              {unreadPeers?.has(peer.username) && (
                <span className="peer-unread" aria-label="unread" />
              )}
              <span className="peer-row-status field-label">
                {peer.status === "online" ? "online" : timeAgo(peer.lastSeen)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
