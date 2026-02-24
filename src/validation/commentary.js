import { z } from "zod";

export const matchIDParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const createCommentarySchema = z.object({
  minute: z.number().int().nonnegative(),
  sequence: z.number().int().nonnegative(),
  period: z.string().min(1),
  eventType: z.string().min(1),
  actor: z.string().min(1).nullable().optional(),
  team: z.string().min(1).nullable().optional(),
  message: z.string().min(1).trim(),
  metadata: z.record(z.any()).default({}),
  tags: z.array(z.string()).default([]),
});
