"""
models.py — SQLite data layer for Relay.

Plain sqlite3 on purpose: no ORM, no network round-trip, nothing to
configure. This mirrors the app's own premise (the network is gone,
so nothing here should depend on infrastructure that isn't sitting
on the same disk as the relay).
"""
import sqlite3
import time
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "relay.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    username    TEXT PRIMARY KEY,
    device_icon TEXT DEFAULT 'radio',
    status      TEXT DEFAULT 'offline',   -- 'online' | 'offline'
    last_seen   REAL DEFAULT 0,
    sid         TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    kind        TEXT NOT NULL,            -- 'direct' | 'channel'
    from_user   TEXT NOT NULL,
    to_user     TEXT,                     -- NULL for channel messages
    text        TEXT NOT NULL,
    timestamp   REAL NOT NULL,
    delivered   INTEGER DEFAULT 0         -- 0 = queued, 1 = delivered
);

CREATE TABLE IF NOT EXISTS broadcasts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user   TEXT NOT NULL,
    text        TEXT NOT NULL,
    timestamp   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS board_posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user   TEXT NOT NULL,
    type        TEXT NOT NULL,            -- 'have' | 'need'
    item        TEXT NOT NULL,
    timestamp   REAL NOT NULL,
    resolved    INTEGER DEFAULT 0
);
"""


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as db:
        db.executescript(SCHEMA)


# ---------- users / presence ----------

def upsert_user(username, device_icon, sid, status="online"):
    with get_db() as db:
        db.execute(
            """INSERT INTO users (username, device_icon, status, last_seen, sid)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(username) DO UPDATE SET
                 device_icon=excluded.device_icon,
                 status=excluded.status,
                 last_seen=excluded.last_seen,
                 sid=excluded.sid""",
            (username, device_icon, status, time.time(), sid),
        )


def set_status(username, status, sid=None):
    with get_db() as db:
        if sid is not None:
            db.execute(
                "UPDATE users SET status=?, last_seen=?, sid=? WHERE username=?",
                (status, time.time(), sid, username),
            )
        else:
            db.execute(
                "UPDATE users SET status=?, last_seen=? WHERE username=?",
                (status, time.time(), username),
            )


def get_user_by_sid(sid):
    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE sid=?", (sid,)).fetchone()
        return dict(row) if row else None


def get_user(username):
    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        return dict(row) if row else None


def all_users():
    with get_db() as db:
        rows = db.execute("SELECT username, device_icon, status, last_seen FROM users ORDER BY username").fetchall()
        return [dict(r) for r in rows]


# ---------- messages ----------

def save_message(kind, from_user, to_user, text, timestamp, delivered):
    with get_db() as db:
        cur = db.execute(
            """INSERT INTO messages (kind, from_user, to_user, text, timestamp, delivered)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (kind, from_user, to_user, text, timestamp, 1 if delivered else 0),
        )
        return cur.lastrowid


def queued_messages_for(username):
    """Direct messages addressed to username that haven't been delivered yet."""
    with get_db() as db:
        rows = db.execute(
            """SELECT * FROM messages WHERE kind='direct' AND to_user=? AND delivered=0
               ORDER BY timestamp ASC""",
            (username,),
        ).fetchall()
        return [dict(r) for r in rows]


def mark_delivered(message_ids):
    if not message_ids:
        return
    with get_db() as db:
        db.executemany("UPDATE messages SET delivered=1 WHERE id=?", [(i,) for i in message_ids])


def recent_channel_messages(limit=50):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM messages WHERE kind='channel' ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in reversed(rows)]


def recent_direct_messages(user_a, user_b, limit=50):
    with get_db() as db:
        rows = db.execute(
            """SELECT * FROM messages WHERE kind='direct'
               AND ((from_user=? AND to_user=?) OR (from_user=? AND to_user=?))
               ORDER BY timestamp DESC LIMIT ?""",
            (user_a, user_b, user_b, user_a, limit),
        ).fetchall()
        return [dict(r) for r in reversed(rows)]


# ---------- broadcasts ----------

def save_broadcast(from_user, text, timestamp):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO broadcasts (from_user, text, timestamp) VALUES (?, ?, ?)",
            (from_user, text, timestamp),
        )
        return cur.lastrowid


def recent_broadcasts(limit=10):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM broadcasts ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in reversed(rows)]


# ---------- needs / resources board ----------

def save_board_post(from_user, post_type, item, timestamp):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO board_posts (from_user, type, item, timestamp) VALUES (?, ?, ?, ?)",
            (from_user, post_type, item, timestamp),
        )
        return cur.lastrowid


def all_board_posts():
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM board_posts WHERE resolved=0 ORDER BY timestamp DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def resolve_board_post(post_id):
    with get_db() as db:
        db.execute("UPDATE board_posts SET resolved=1 WHERE id=?", (post_id,))
