import dotenv from "dotenv";
// Initialize env vars at the very top for Node compatibility
dotenv.config();

// import AgentAPI from "apminsight";
// AgentAPI.config();

import express from "express";
import http from "http";
import { matchRouter } from "./routes/matches.js";
import { commentaryRouter } from "./routes/commentary.js";
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from "./arcjet.js";

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.use(securityMiddleware());

app.get("/", (req, res) => {
  res.send("Hello from Express server!");
});

// app.get("/matches", (req, res) => {
//   res.json({ message: "Success! Matches route is active." });
// });

app.post("/matches", (req, res) => {
  const matchData = req.body;

  console.log("Match received:", matchData);

  if (req.app.locals.broadcastMatchCreated) {
    req.app.locals.broadcastMatchCreated(matchData);
  }

  res.status(201).json({
    success: true,
    message: "Match created and broadcasted.",
    data: matchData,
  });
});

const { broadcastMatchCreated, broadcastCommentary } =
  attachWebSocketServer(server);

app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

app.use("/matches", matchRouter);
app.use("/matches/:id/commentary", commentaryRouter);

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`\n🚀 SERVER STARTED SUCCESSFULLY`);
  console.log(`URL: ${baseUrl}`);
  console.log(`Waiting for requests...`);
  console.log(`------------------------------------------`);
});
