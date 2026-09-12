import { z } from "zod";

export const commandEnvelopeSchema = z.object({
  protocolVersion: z.string().min(1),
  worldId: z.string().min(1),
  sessionId: z.string().min(1),
  commandId: z.string().min(1),
  clientSeq: z.number().int().nonnegative(),
  intent: z.string().min(1),
  expectedEntityRevision: z.number().int().nonnegative().optional(),
  payload: z.unknown(),
});

export const commandResultSchema = z.object({
  status: z.enum(["accepted", "rejected", "pending"]),
  reason: z.string().optional(),
  worldRevision: z.number().int().nonnegative(),
  serverTick: z.number().int().nonnegative(),
});

export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>;
export type CommandResult = z.infer<typeof commandResultSchema>;
