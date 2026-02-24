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

app.get("/", (req, res) => {
  res.send("Hello from Express server!");
});

// Middleware for Arcjet Security
app.use(securityMiddleware());

// A simple route for your 'curl' loop to test against
app.get("/matches", (req, res) => {
  res.json({ message: "Success! Matches route is active." });
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
