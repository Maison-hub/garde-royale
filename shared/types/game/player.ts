// shared/game/player.ts
import { z } from "zod";

export const playerSchema = z.object({
  id: z.string(),
  pseudo: z.string(),
  connected: z.boolean(),
});

export type Player = z.infer<typeof playerSchema>;
