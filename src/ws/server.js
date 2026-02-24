import { WebSocketServer } from "ws";
import { WebSocket } from "ws";

function sendJson(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) return;

  socket.send(stringify(payload));
}

function broadcast(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) return;

    client.send(stringify(payload));
  }
}

export function attachWebSocketserver(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", (socket) => {
    sendJson(socket, { type: "welcome" });

    socket.on("error", console.error);
  });
  function broadcastMatchCreated(match) {
    broadcast(wss, { type: "match_created", data: match });
  }

  return {
    broadcastMatchCreated,
  };
}
