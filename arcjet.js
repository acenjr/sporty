import arcjet, { detectBot, shield, tokenBucket } from "@arcjet/node";
import http from "node:http";
import "dotenv/config";

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE"],
    }),
    tokenBucket({
      mode: "LIVE",
      characteristics: ["testId"],
      refillRate: 10,
      interval: 60, // Refill 10 tokens every minute
      capacity: 40, // ALLOW 40 REQUESTS IN A BURST
    }),
  ],
});

const server = http.createServer(async function (req, res) {
  // IMPORTANT: For your loop to actually hit the limit,
  // we use a STABLE ID for the duration of the test.
  // If we used a random ID every time, you would never hit a 429.
  const testId = "local-stress-test-session";

  try {
    const decision = await aj.protect(req, {
      requested: 1,
      testId: testId,
    });

    console.log(
      `[${new Date().toLocaleTimeString()}] Status: ${decision.conclusion} | Remaining: ${decision.reason.remaining}`,
    );

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        res.writeHead(429, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({
            error: "Rate limit reached",
            reset: decision.reason.reset,
          }),
        );
      }
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Access denied" }));
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        message: "Success!",
        remaining: decision.reason.remaining,
      }),
    );
  } catch (error) {
    console.error("Arcjet error:", error);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
});

server.listen(8000, () => {
  console.log("Server running. Capacity set to 40.");
});
