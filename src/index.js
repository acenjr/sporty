import express, { json } from "express";
import http from "http";
import { detectBot } from "@arcjet/node"; // Note: Ensure @arcjet/node is installed
import { matchRouter } from "./routes/matches.js";
import { attachWebSocketserver } from "./ws/server.js";
// import { securityMiddleware } from "./middleware/security.js"; // Ensure this is imported

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

// 1. Core Middleware
app.use(json());

// 2. Arcjet Bot Detection - Mount early to stop bots before processing logic
app.use(
  detectBot({
    mode: process.env.ARCJET_MODE || "LIVE", // LIVE blocks, DRY_RUN logs only
    // allow only known search engines; do NOT include "CURL"
    allow: ["CATEGORY:SEARCH_ENGINE"],
  }),
);

// 3. Manual Fallback Block for CLI tools / Missing User Agents
app.use((req, res, next) => {
  const ua = (req.headers["user-agent"] || "").toString();
  if (!ua || /(^|\s)(curl|wget|httpie)(\/|\s|$)/i.test(ua)) {
    return res.status(403).send("Forbidden: CLI tools are not allowed.");
  }
  next();
});

// 4. Routes
app.get("/", (req, res) => {
  res.send("Welcome to the new project API.");
});

// app.use(securityMiddleware()); // Re-enabled from your original block
app.use("/matches", matchRouter);

// 5. WebSocket Setup
const { broadcastMatchCreated } = attachWebSocketserver(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

// 6. Start Server
server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server started: ${baseUrl}`);
  console.log(
    `Websocket server is running on ${baseUrl.replace("http", "ws")}/ws`,
  );
});
