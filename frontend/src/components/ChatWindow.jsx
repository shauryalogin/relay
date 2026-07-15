import { useEffect, useRef, useState } from "react";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWindow({ title, subtitle, messages, self, onSend, placeholder, peerOnline }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <section className="chat-window" aria-label={title}>
      <header className="chat-header">
        <div>
          <h2 className="chat-title">{title}</h2>
          {subtitle && <div className="chat-subtitle field-label">{subtitle}</div>}
        </div>
        {peerOnline === false && (
          <div className="chat-queue-note field-label">
            Peer offline — messages will relay on reconnect
          </div>
        )}
      </header>

      <div className="chat-scroll" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-empty">Nothing here yet. First transmission is yours.</div>
        )}
        {messages.map((m, i) => {
          const mine = m.from === self?.username;
          
          // Determine local store-and-forward status
          let statusText = null;
          if (mine && peerOnline !== undefined) {
            statusText = peerOnline ? (
              <span style={{ color: "var(--teal)", fontSize: "9px", fontWeight: "bold" }}> ✓ TX</span>
            ) : (
              <span style={{ color: "var(--amber)", fontSize: "9px", fontWeight: "bold" }}> ⚠️ QUEUED</span>
            );
          }

          return (
            <div key={i} className={`bubble-row ${mine ? "bubble-row-mine" : ""}`}>
              <div 
                className={`bubble ${mine ? "bubble-mine" : ""}`}
                style={mine && !peerOnline && peerOnline !== undefined ? { borderStyle: "dashed" } : {}}
              >
                {!mine && <div className="bubble-from field-label">{m.from}</div>}
                <div className="bubble-text">{m.text}</div>
                <div className="bubble-time mono" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "4px" }}>
                  <span>{formatTime(m.timestamp)}</span>
                  {statusText}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          className="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder || "Type a message…"}
          maxLength={500}
          autoComplete="off"
        />
        <button className="chat-send" type="submit" disabled={!draft.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
