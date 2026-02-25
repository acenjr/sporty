import { WebSocketServer, WebSocket } from "ws";
import { wsArcjet } from "../arcjet.js";
import { z } from "zod"; // ✅ ADDED

// ✅ ADDED: WebSocket message schema
const wsMessageSchema = z.object({
  type: z.enum(["subscribe", "unsubscribe"]),
  matchId: z.coerce.number().int().positive(),
});

// Keep track of which sockets are interested in which matches
const matchSubscribers = new Map();

/**
 * Utility to manage match subscriptions
 */
function subscribe(matchId, socket) {
  matchId = Number(matchId);
  console.log(
    "Subscribing socket:",
    socket._socket?.remoteAddress || socket,
    "to matchId:",
    matchId,
  );

  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;

  subscribers.delete(socket);

  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscriptions(socket) {
  if (!socket.subscriptions) return;
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

/**
 * Sends a JSON payload to a specific socket
 */
function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

/**
 * Broadcasts to EVERYONE (Used for new matches)
 */
function broadcastToAll(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(JSON.stringify(payload));
  }
}

/**
 * Broadcasts ONLY to subscribers of a specific match
 */
function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);
  console.log(
    "Broadcasting to match:",
    matchId,
    "subscribers:",
    subscribers?.size,
  );

  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);
  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/**
 * Handles incoming client messages (subscribe/unsubscribe)
 */
function handleMessage(socket, data) {
  console.log("Incoming WS message:", data.toString());

  let parsed;

  // ✅ REPLACED manual parsing with Zod validation
  try {
    parsed = wsMessageSchema.parse(JSON.parse(data.toString()));
  } catch {
    sendJson(socket, { type: "error", message: "Invalid message format" });
    return;
  }

  const { type, matchId } = parsed;

  if (type === "subscribe") {
    subscribe(matchId, socket);
    socket.subscriptions.add(matchId);
    sendJson(socket, { type: "subscribed", matchId });
    return;
  }

  if (type === "unsubscribe") {
    unsubscribe(matchId, socket);
    socket.subscriptions.delete(matchId);
    sendJson(socket, { type: "unsubscribed", matchId });
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", async (socket, req) => {
    // Security Check via Arcjet
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);
        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          if (socket.readyState <= WebSocket.OPEN) {
            socket.close(code, "Denied by security policy");
          }
          return;
        }
      } catch (e) {
        console.error("WebSocket Arcjet error:", e);
        socket.close(1011, "Security check failure");
        return;
      }
    }

    // Initialize socket state
    socket.isAlive = true;
    socket.subscriptions = new Set();

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    sendJson(socket, { type: "welcome" });

    socket.on("message", (data) => handleMessage(socket, data));

    socket.on("close", () => {
      cleanupSubscriptions(socket);
    });

    socket.on("error", (err) => {
      console.error("WebSocket Error:", err);
      socket.terminate();
    });
  });

  // Heartbeat to clear stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  /**
   * Broadcast functions returned to Express
   */
  function broadcastMatchCreated(match) {
    broadcastToAll(wss, { type: "match_created", data: match });
  }

  function broadcastCommentary(matchId, comment) {
    broadcastToMatch(matchId, { type: "commentary", data: comment });
  }

  return {
    broadcastMatchCreated,
    broadcastCommentary,
  };
}
