"""
sockets.py — Socket.IO event handlers.

Event contract (matches the frontend's useSocket hook):
  join                -> { username, deviceIcon }
  message:direct       -> { to, from, text, timestamp }
  message:channel       -> { from, text, timestamp }
  broadcast:emergency   -> { from, text, timestamp }
  board:post            -> { from, type: 'have'|'need', item, timestamp }
  board:resolve          -> { postId }
  presence:update  (srv->clients) [{ username, deviceIcon, status, lastSeen }]
  queue:sync       (srv->client)  { messages: [...] }  on reconnect
"""
import time
from flask_socketio import emit, join_room
import models


def register_socket_handlers(socketio):

    def broadcast_presence():
        users = models.all_users()
        payload = [
            {
                "username": u["username"],
                "deviceIcon": u["device_icon"],
                "status": u["status"],
                "lastSeen": u["last_seen"],
            }
            for u in users
        ]
        socketio.emit("presence:update", payload)

    @socketio.on("connect")
    def handle_connect():
        # Nothing to do until the client sends `join` with an identity.
        pass

    @socketio.on("join")
    def handle_join(data):
        from flask import request

        username = (data or {}).get("username", "").strip()
        device_icon = (data or {}).get("deviceIcon", "radio")
        if not username:
            emit("join:error", {"message": "A callsign is required to join the network."})
            return

        existing = models.get_user(username)
        if existing and existing["status"] == "online" and existing["sid"] != request.sid:
            emit("join:error", {"message": "That callsign is already active on the network."})
            return

        models.upsert_user(username, device_icon, request.sid, status="online")
        join_room(username)  # private room so we can target this user by username
        join_room("network-channel")

        # Send this client its own history + queued relay messages.
        queued = models.queued_messages_for(username)
        channel_history = models.recent_channel_messages(limit=50)
        broadcasts = models.recent_broadcasts(limit=5)
        board = models.all_board_posts()

        emit(
            "join:ack",
            {
                "username": username,
                "deviceIcon": device_icon,
                "channelHistory": channel_history,
                "broadcasts": broadcasts,
                "board": board,
            },
        )

        if queued:
            emit(
                "queue:sync",
                {
                    "messages": [
                        {
                            "from": m["from_user"],
                            "to": m["to_user"],
                            "text": m["text"],
                            "timestamp": m["timestamp"],
                        }
                        for m in queued
                    ]
                },
            )
            models.mark_delivered([m["id"] for m in queued])

        broadcast_presence()

    @socketio.on("disconnect")
    def handle_disconnect():
        from flask import request

        user = models.get_user_by_sid(request.sid)
        if user:
            models.set_status(user["username"], "offline")
            broadcast_presence()

    @socketio.on("message:direct")
    def handle_direct_message(data):
        from flask import request

        to_user = (data or {}).get("to", "").strip()
        from_user = (data or {}).get("from", "").strip()
        text = (data or {}).get("text", "").strip()
        timestamp = (data or {}).get("timestamp") or time.time()

        if not (to_user and from_user and text):
            return

        recipient = models.get_user(to_user)
        recipient_online = bool(recipient and recipient["status"] == "online")

        models.save_message("direct", from_user, to_user, text, timestamp, delivered=recipient_online)

        payload = {"from": from_user, "to": to_user, "text": text, "timestamp": timestamp}

        # Echo back to sender immediately (their own UI already renders it optimistically,
        # but this keeps a second tab / device in sync).
        emit("message:direct", payload, room=from_user)

        if recipient_online:
            emit("message:direct", payload, room=to_user)
        # else: message is now sitting in the queue, delivered on the recipient's next `join`.

    @socketio.on("message:channel")
    def handle_channel_message(data):
        from_user = (data or {}).get("from", "").strip()
        text = (data or {}).get("text", "").strip()
        timestamp = (data or {}).get("timestamp") or time.time()

        if not (from_user and text):
            return

        models.save_message("channel", from_user, None, text, timestamp, delivered=True)
        socketio.emit("message:channel", {"from": from_user, "text": text, "timestamp": timestamp}, room="network-channel")

    @socketio.on("broadcast:emergency")
    def handle_broadcast(data):
        from_user = (data or {}).get("from", "").strip()
        text = (data or {}).get("text", "").strip()
        timestamp = (data or {}).get("timestamp") or time.time()

        if not (from_user and text):
            return

        models.save_broadcast(from_user, text, timestamp)
        socketio.emit("broadcast:emergency", {"from": from_user, "text": text, "timestamp": timestamp})

    @socketio.on("board:post")
    def handle_board_post(data):
        from_user = (data or {}).get("from", "").strip()
        post_type = (data or {}).get("type", "").strip()
        item = (data or {}).get("item", "").strip()
        timestamp = (data or {}).get("timestamp") or time.time()

        if not (from_user and post_type in ("have", "need") and item):
            return

        post_id = models.save_board_post(from_user, post_type, item, timestamp)
        socketio.emit(
            "board:post",
            {"id": post_id, "from": from_user, "type": post_type, "item": item, "timestamp": timestamp},
        )

    @socketio.on("board:resolve")
    def handle_board_resolve(data):
        post_id = (data or {}).get("postId")
        if not post_id:
            return
        models.resolve_board_post(post_id)
        socketio.emit("board:resolved", {"postId": post_id})
