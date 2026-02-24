import { Router } from "express";
import { db } from "../db/db.js";
import { desc } from "drizzle-orm";
import { matches } from "../db/schema.js";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validation/matches.js";
import { getMatchStatus } from "../utils/match-status.js";

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: JSON.stringify(parsed.error),
    });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);

    res.json({ data });
  } catch (e) {
    res.status(500).json({
      error: "Failed to fetch matches",
      details: e?.message ?? JSON.stringify(e),
    });
  }
});

matchRouter.post("/", async (req, res) => {
  try {
    const match = await createMatch(req.body);

    // Broadcast as best-effort - don't fail the request if it throws
    try {
      req.app.locals.broadcastMatchCreated(match);
    } catch (broadcastError) {
      console.error("Broadcast failed:", broadcastError);
      // Continue - the match was successfully created
    }

    res.status(201).json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
