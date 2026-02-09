import { eq } from "drizzle-orm";
import { db, pool } from "./db/db.js";
import { matches, commentary } from "./db/schema.js";

async function main() {
  try {
    console.log("Performing CRUD operations for sports application...\n");

    // CREATE: Insert a new match
    const [newMatch] = await db
      .insert(matches)
      .values({
        sport: "Football",
        homeTeam: "Manchester United",
        awayTeam: "Liverpool",
        status: "scheduled",
        startTime: new Date("2025-02-15T15:00:00Z"),
        homeScore: 0,
        awayScore: 0,
      })
      .returning();

    if (!newMatch) {
      throw new Error("Failed to create match");
    }

    console.log("✅ CREATE (matches): New match created:", newMatch);

    // CREATE: Insert commentary for the match
    const [newCommentary] = await db
      .insert(commentary)
      .values({
        matchId: newMatch.id,
        minute: 25,
        sequence: 1,
        period: "First Half",
        eventType: "goal",
        actor: "Bruno Fernandes",
        team: "Manchester United",
        message: "Bruno Fernandes scores with a brilliant free kick!",
        metadata: { power: 95, accuracy: 98 },
        tags: ["goal", "free-kick", "bruno-fernandes"],
      })
      .returning();

    if (!newCommentary) {
      throw new Error("Failed to create commentary");
    }

    console.log("✅ CREATE (commentary): New commentary added:", newCommentary);
    console.log();

    // READ: Select the match
    const foundMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.id, newMatch.id));
    console.log("✅ READ (matches): Found match:", foundMatches[0]);

    // READ: Select commentary for the match
    const foundCommentary = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, newMatch.id));
    console.log("✅ READ (commentary): Found commentary:", foundCommentary);
    console.log();

    // UPDATE: Change match status to live and update scores
    const [updatedMatch] = await db
      .update(matches)
      .set({
        status: "live",
        homeScore: 1,
        awayScore: 0,
      })
      .where(eq(matches.id, newMatch.id))
      .returning();

    if (!updatedMatch) {
      throw new Error("Failed to update match");
    }

    console.log("✅ UPDATE (matches): Match updated:", updatedMatch);

    // UPDATE: Update commentary metadata
    const [updatedCommentary] = await db
      .update(commentary)
      .set({
        message: "Goal confirmed! Manchester United 1 - 0 Liverpool",
        metadata: {
          reviewed: true,
          confirmationTime: new Date().toISOString(),
        },
      })
      .where(eq(commentary.id, newCommentary.id))
      .returning();

    if (!updatedCommentary) {
      throw new Error("Failed to update commentary");
    }

    console.log(
      "✅ UPDATE (commentary): Commentary updated:",
      updatedCommentary,
    );
    console.log();

    // DELETE: Remove the commentary
    await db.delete(commentary).where(eq(commentary.id, newCommentary.id));
    console.log("✅ DELETE (commentary): Commentary deleted.");

    // DELETE: Remove the match
    await db.delete(matches).where(eq(matches.id, newMatch.id));
    console.log("✅ DELETE (matches): Match deleted.");

    console.log("\n✨ CRUD operations completed successfully.");
  } catch (error) {
    console.error("❌ Error performing CRUD operations:", error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log("Database pool closed.");
    }
  }
}

main();
