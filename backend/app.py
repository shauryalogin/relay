"""
app.py — Relay backend entrypoint.

Runs a Flask + Flask-SocketIO server that acts as the local rendezvous
point for every client on the LAN. Nothing in this file talks to the
public internet: no external API calls, no third-party auth, no cloud
DB. Everything a client needs — presence, chat history, the offline
queue, broadcasts, the needs board — lives in the SQLite file next to
this script.

Run with:
    python app.py
The server listens on 0.0.0.0 so any device on the same LAN/wifi can
reach it via the host machine's local IP (e.g. http://192.168.1.23:5000).
"""
import os
from flask import Flask, send_from_directory
from flask_socketio import SocketIO

import models
from sockets import register_socket_handlers

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path="")
app.config["SECRET_KEY"] = os.environ.get("RELAY_SECRET_KEY", "relay-local-dev-only")

# CORS is left open because this only ever runs on a private LAN behind
# no public routing — there's no cloud edge to lock it down against.
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

register_socket_handlers(socketio)


@app.route("/api/health")
def health():
    return {"status": "online", "service": "relay-backend"}


@app.route("/api/peers")
def peers():
    return {"peers": models.all_users()}


# Serve the built frontend (after `npm run build`) so the whole app can
# be reached from a single port during a demo — no separate dev server
# required once you've built it.
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path and os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, "index.html")


if __name__ == "__main__":
    models.init_db()
    print("Relay backend starting on http://0.0.0.0:5000")
    print("Find your LAN IP (e.g. `ipconfig getifaddr en0` on macOS, `hostname -I` on Linux)")
    print("and open http://<that-ip>:5000 from any other device on the same wifi/LAN.")
    socketio.run(app, host="0.0.0.0", port=5000)
