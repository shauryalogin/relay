import { useState } from "react";
import { audioManager } from "../utils/audio.js";

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function NeedsBoard({ board, self, onPost, onResolve }) {
  const [type, setType] = useState("have");
  const [item, setItem] = useState("");

  const haves = board.filter((p) => p.type === "have");
  const needs = board.filter((p) => p.type === "need");

  function handleTypeToggle(t) {
    audioManager.playKeystroke();
    setType(t);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = item.trim();
    if (!trimmed) return;
    audioManager.playLock();
    onPost(type, trimmed);
    setItem("");
  }

  return (
    <section className="board-view" aria-label="Needs and resources board">
      <header className="chat-header">
        <div>
          <h2 className="chat-title">Needs &amp; Resources</h2>
          <div className="chat-subtitle field-label">Shared bulletin — visible to the whole network</div>
        </div>
      </header>

      <form className="board-form" onSubmit={handleSubmit}>
        <div className="board-type-toggle" role="radiogroup" aria-label="Post type">
          <button
            type="button"
            role="radio"
            aria-checked={type === "have"}
            className={`board-type-btn ${type === "have" ? "board-type-btn-have active-teal" : ""}`}
            onClick={() => handleTypeToggle("have")}
          >
            Have
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={type === "need"}
            className={`board-type-btn ${type === "need" ? "board-type-btn-need active-amber" : ""}`}
            onClick={() => handleTypeToggle("need")}
          >
            Need
          </button>
        </div>
        <input
          className="chat-input"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder={type === "have" ? "e.g. bottled water, 6 units" : "e.g. insulin, first-aid kit"}
          maxLength={120}
        />
        <button className="chat-send" type="submit" disabled={!item.trim()}>
          Post
        </button>
      </form>

      <div className="board-columns">
        <div className="board-column">
          <div className="field-label board-column-label board-column-label-have">Have — {haves.length}</div>
          <div className="board-list">
            {haves.length === 0 && (
              <div className="board-empty-box mono">
                <span>[ STATUS: EMPTY_ROSTER ]</span>
                <span>No active resources offered. Post a cargo dispatch.</span>
              </div>
            )}
            {haves.map((p) => (
              <BoardCard key={p.id} post={p} self={self} onResolve={onResolve} />
            ))}
          </div>
        </div>
        <div className="board-column">
          <div className="field-label board-column-label board-column-label-need">Need — {needs.length}</div>
          <div className="board-list">
            {needs.length === 0 && (
              <div className="board-empty-box mono">
                <span>[ STATUS: EMPTY_DISPATCH ]</span>
                <span>No outstanding requests. Relays report clear sectors.</span>
              </div>
            )}
            {needs.map((p) => (
              <BoardCard key={p.id} post={p} self={self} onResolve={onResolve} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BoardCard({ post, self, onResolve }) {
  const isHave = post.type === "have";
  return (
    <div className={`board-card board-card-${post.type}`}>
      <span className={`board-card-tag board-card-tag-${post.type}`}>
        {isHave ? "⚓ Cargo Avail" : "⚠ Dispatch Req"}
      </span>
      <div className="board-card-item">{post.item}</div>
      <div className="board-card-meta field-label">
        {post.from} · {formatTime(post.timestamp)}
      </div>
      {post.from === self?.username && (
        <button 
          className="board-card-resolve" 
          onClick={() => {
            audioManager.playKeystroke();
            onResolve(post.id);
          }}
        >
          Mark resolved
        </button>
      )}
    </div>
  );
}
