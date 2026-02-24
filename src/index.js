import express, { json } from "express";
import { matchRouter } from "./routes/matches.js";
import http from "http";
import { attachWebSocketserver } from "./ws/server.js";
const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

const app = express();

const server = http.createServer(app);

// Middleware to parse incoming JSON
app.use(json());

// Basic GET route
app.get("/", (req, res) => {
  res.send("Welcome to the new project API.");
});

app.use("/matches", matchRouter);

const { broadcastMatchCreated } = attachWebSocketserver(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

// Start server and log the URL
server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server started: ${baseUrl}`);

  console.log(
    `Websocket server is running on ${baseUrl.replace("http", "ws")}/ws`,
  );
});
