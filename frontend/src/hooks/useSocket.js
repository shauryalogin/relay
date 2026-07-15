import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { audioManager } from "../utils/audio.js";

/**
 * Owns the Socket.IO connection and all relay state. One instance of
 * this hook is created at the App root and its values are threaded
 * down as props — keeps every component a plain function of state
 * instead of each one reaching into its own socket.
 */
export function useSocket() {
  const socketRef = useRef(null);
  const selfRef = useRef(null); // mirrors `self` state so socket callbacks registered once still see the latest value
  const peersRef = useRef([]); // mirrors peers list for comparison
  const [connected, setConnected] = useState(false);
  const [signal, setSignal] = useState("offline"); // 'strong' | 'weak' | 'offline'
  const [self, setSelf] = useState(null); // { username, deviceIcon }
  const [joinError, setJoinError] = useState(null);
  const [peers, setPeers] = useState([]);
  const [channelMessages, setChannelMessages] = useState([]);
  const [directMessages, setDirectMessages] = useState({}); // { peerUsername: [msg,...] }
  const [broadcasts, setBroadcasts] = useState([]);
  const [board, setBoard] = useState([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const socket = io("/", {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setSignal("strong");
      setReconnectAttempts(0);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setSignal("offline");
    });

    socket.io.on("reconnect_attempt", (n) => {
      setSignal("weak");
      setReconnectAttempts(n);
    });

    socket.on("join:ack", (data) => {
      selfRef.current = { username: data.username, deviceIcon: data.deviceIcon };
      setSelf({ username: data.username, deviceIcon: data.deviceIcon });
      setJoinError(null);
      audioManager.playLock();
      setChannelMessages(
        (data.channelHistory || []).map((m) => ({
          from: m.from_user,
          text: m.text,
          timestamp: m.timestamp,
        }))
      );
      setBroadcasts(
        (data.broadcasts || []).map((b) => ({
          from: b.from_user,
          text: b.text,
          timestamp: b.timestamp,
        }))
      );
      setBoard(
        (data.board || []).map((p) => ({
          id: p.id,
          from: p.from_user,
          type: p.type,
          item: p.item,
          timestamp: p.timestamp,
        }))
      );
    });

    socket.on("join:error", (data) => {
      setJoinError(data.message);
    });

    socket.on("presence:update", (list) => {
      // Check if a peer came online
      const oldOnline = peersRef.current.filter(p => p.status === "online" && p.username !== selfRef.current?.username);
      const newOnline = list.filter(p => p.status === "online" && p.username !== selfRef.current?.username);
      
      if (newOnline.length > oldOnline.length && selfRef.current) {
        audioManager.playPeerOnline();
      }
      
      peersRef.current = list;
      setPeers(list);
    });

    socket.on("queue:sync", (data) => {
      const byPeer = {};
      (data.messages || []).forEach((m) => {
        const key = m.from;
        byPeer[key] = byPeer[key] || [];
        byPeer[key].push(m);
      });
      setDirectMessages((prev) => {
        const next = { ...prev };
        Object.entries(byPeer).forEach(([peer, msgs]) => {
          next[peer] = [...(next[peer] || []), ...msgs].sort((a, b) => a.timestamp - b.timestamp);
        });
        return next;
      });
    });

    socket.on("message:channel", (msg) => {
      setChannelMessages((prev) => [...prev, msg]);
      if (selfRef.current) {
        if (msg.from === selfRef.current.username) {
          audioManager.playMsgSent();
        } else {
          audioManager.playMsgRecv();
        }
      }
    });

    socket.on("message:direct", (msg) => {
      setDirectMessages((prev) => {
        const peer = msg.from === selfRef.current?.username ? msg.to : msg.from;
        const next = { ...prev };
        const existing = next[peer] || [];
        if (existing.some((m) => m.timestamp === msg.timestamp && m.text === msg.text && m.from === msg.from)) {
          return prev;
        }
        next[peer] = [...existing, msg];
        return next;
      });
      if (selfRef.current) {
        if (msg.from === selfRef.current.username) {
          audioManager.playMsgSent();
        } else {
          audioManager.playMsgRecv();
        }
      }
    });

    socket.on("broadcast:emergency", (msg) => {
      setBroadcasts((prev) => [...prev, msg]);
      // Alarm is started inside the BroadcastBanner effect or direct callback,
      // but let's handle the audio siren in audioManager.startAlarm() directly.
      audioManager.startAlarm();
    });

    socket.on("board:post", (post) => {
      setBoard((prev) => [post, ...prev]);
      if (selfRef.current && post.from !== selfRef.current.username) {
        audioManager.playMsgRecv();
      }
    });

    socket.on("board:resolved", ({ postId }) => {
      setBoard((prev) => prev.filter((p) => p.id !== postId));
      audioManager.playMsgSent(); // light resolve feedback sound
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = useCallback((username, deviceIcon) => {
    socketRef.current?.emit("join", { username, deviceIcon });
  }, []);

  const sendChannelMessage = useCallback(
    (text) => {
      if (!self) return;
      const timestamp = Date.now() / 1000;
      socketRef.current?.emit("message:channel", { from: self.username, text, timestamp });
    },
    [self]
  );

  const sendDirectMessage = useCallback(
    (to, text) => {
      if (!self) return;
      const timestamp = Date.now() / 1000;
      // optimistic local echo
      setDirectMessages((prev) => {
        const next = { ...prev };
        next[to] = [...(next[to] || []), { from: self.username, to, text, timestamp }];
        return next;
      });
      socketRef.current?.emit("message:direct", { to, from: self.username, text, timestamp });
    },
    [self]
  );

  const sendBroadcast = useCallback(
    (text) => {
      if (!self) return;
      const timestamp = Date.now() / 1000;
      socketRef.current?.emit("broadcast:emergency", { from: self.username, text, timestamp });
    },
    [self]
  );

  const postBoard = useCallback(
    (type, item) => {
      if (!self) return;
      const timestamp = Date.now() / 1000;
      socketRef.current?.emit("board:post", { from: self.username, type, item, timestamp });
    },
    [self]
  );

  const resolveBoard = useCallback((postId) => {
    socketRef.current?.emit("board:resolve", { postId });
  }, []);

  return {
    connected,
    signal,
    reconnectAttempts,
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
  };
}
