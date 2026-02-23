import express, { json } from "express";
import { matchRouter } from "./routes/matches.js";

const app = express();
const PORT = 8080;

// Middleware to parse incoming JSON
app.use(json());

// Basic GET route
app.get("/", (req, res) => {
  res.send("Welcome to the new project API.");
});

app.use("/matches", matchRouter);

// Start server and log the URL
app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});
