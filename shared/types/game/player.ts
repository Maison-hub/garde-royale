// shared/game/player.ts
import { z } from "zod";

export const playerSchema = z.object({
  id: z.string(),
  pseudo: z.string(),
});

export type Player = z.infer<typeof playerSchema>;