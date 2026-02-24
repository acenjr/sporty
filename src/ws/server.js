import { WebSocketServer, WebSocket } from "ws";
import { wsArcjet } from "../arcjet.js";

/**
 * Sends a JSON payload to a specific socket if the connection is open.
 */
function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

/**
 * Broadcasts a JSON payload to all currently connected and open clients.
 */
function broadcast(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(JSON.stringify(payload));
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    // 1MB max payload to prevent memory exhaustion attacks
    maxPayload: 1024 * 1024,
  });

  // The 'req' argument is the http.IncomingMessage from the initial upgrade
  wss.on("connection", async (socket, req) => {
    if (wsArcjet) {
      try {
        /**
         * FIX: Pass 'req' (the HTTP request), NOT 'socket'.
         * Arcjet needs headers and IP info to evaluate rules like shield and rate limits.
         */
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit()
            ? "Rate limit exceeded"
            : "Connection denied by Arcjet";

          // Only close if the socket is still in a state that can be closed
          if (
            socket.readyState === WebSocket.CONNECTING ||
            socket.readyState === WebSocket.OPEN
          ) {
            socket.close(code, reason);
          }
          return;
        }
      } catch (e) {
        console.error("WebSocket Arcjet protection error:", e);
        if (
          socket.readyState === WebSocket.CONNECTING ||
          socket.readyState === WebSocket.OPEN
        ) {
          socket.close(1011, "Internal Server Error during security check");
        }
        return;
      }
    }

    // Success: Connection allowed
    sendJson(socket, { type: "welcome" });

    socket.on("error", (err) => {
      console.error("WebSocket Error:", err);
    });
  });

  /**
   * Public API to trigger broadcasts from other parts of the app (e.g., Express routes)
   */
  function broadcastMatchCreated(match) {
    broadcast(wss, { type: "match_created", data: match });
  }

  return {
    broadcastMatchCreated,
  };
}
