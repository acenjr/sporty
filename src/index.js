import dotenv from "dotenv";
// Initialize env vars at the very top for Node compatibility
dotenv.config();

// import AgentAPI from "apminsight";
// AgentAPI.config();

import express from "express";
import http from "http";
// import { matchRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from "./arcjet.js";

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

app.use(express.json());

// Middleware for Arcjet Security
app.use(securityMiddleware());

app.get("/", (req, res) => {
  res.send("Hello from Express server!");
});

/**
 * GET /matches
 * Simple route for health checks or manual verification
 */
app.get("/matches", (req, res) => {
  res.json({ message: "Success! Matches route is active." });
});

/**
 * POST /matches
 * Restored to support scripts/postMatch.js and broadcast via WebSockets
 */
app.post("/matches", (req, res) => {
  const matchData = req.body;

  // Log the incoming data for debugging (as seen in typical dev environments)
  console.log("Match received:", matchData);

  // Trigger the WebSocket broadcast to all connected clients
  if (req.app.locals.broadcastMatchCreated) {
    req.app.locals.broadcastMatchCreated(matchData);
  }

  res.status(201).json({
    success: true,
    message: "Match created and broadcasted.",
    data: matchData,
  });
});

// app.use("/matches", matchRouter);

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`\n🚀 SERVER STARTED SUCCESSFULLY`);
  console.log(`URL: ${baseUrl}`);
  console.log(`Waiting for requests...`);
  console.log(`------------------------------------------`);
});
