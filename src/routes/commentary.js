import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import * as Validations from "../validation/commentary.js";

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

// GET /matches/:id/commentary - Fetch all commentary for a match
commentaryRouter.get("/", async (req, res) => {
  try {
    const paramsValidation = Validations.matchIDParamsSchema.safeParse(
      req.params,
    );
    if (!paramsValidation.success) {
      return res.status(400).json({
        error: "Invalid match ID",
        details: paramsValidation.error.errors,
      });
    }

    const queryValidation = Validations.listCommentaryQuerySchema.safeParse(
      req.query,
    );
    if (!queryValidation.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: queryValidation.error.errors,
      });
    }

    const { id } = paramsValidation.data;
    const { limit = 10 } = queryValidation.data;

    // Apply safety cap from original logic
    const safeLimit = Math.min(limit, MAX_LIMIT);

    const results = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, id))
      .orderBy(desc(commentary.createdAt))
      .limit(safeLimit);

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Fetch commentary error:", error);
    res.status(500).json({
      error: "Failed to fetch commentary",
      message: error.message,
    });
  }
});

// POST /matches/:id/commentary - Create and Broadcast new commentary
commentaryRouter.post("/", async (req, res) => {
  try {
    const paramsValidation = Validations.matchIDParamsSchema.safeParse(
      req.params,
    );
    if (!paramsValidation.success) {
      return res.status(400).json({ error: "Invalid match ID" });
    }

    const bodyValidation = Validations.createCommentarySchema.safeParse(
      req.body,
    );
    if (!bodyValidation.success) {
      return res.status(400).json({
        error: "Invalid commentary data",
        details: bodyValidation.error.errors,
      });
    }

    // Insert into database
    const [insertedComment] = await db
      .insert(commentary)
      .values({
        matchId: paramsValidation.data.id,
        ...bodyValidation.data,
        createdAt: new Date(),
      })
      .returning();

    // RESTORED BROADCAST LOGIC
    // Access the emitter attached in index.js
    const broadcastCommentary = req.app.locals.broadcastCommentary;
    if (broadcastCommentary) {
      console.log(
        "About to broadcast commentary for match:",
        paramsValidation.data.id,
      );
      console.log(
        "BroadcastCommentary function exists:",
        !!req.app.locals.broadcastCommentary,
      );

      broadcastCommentary(paramsValidation.data.id, insertedComment);
    }

    res.status(201).json({
      success: true,
      data: insertedComment,
    });
  } catch (error) {
    console.error("Create commentary error:", error);
    res.status(500).json({
      error: "Failed to create commentary",
      message: error.message,
    });
  }
});
