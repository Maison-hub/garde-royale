import { z } from "zod";

/** État public d'un joueur pendant la manche en cours. */
export const roundPlayerStateSchema = z.object({
  playerId: z.string(),
  eliminated: z.boolean(),
  protected: z.boolean(),
});

export type RoundPlayerState = z.infer<typeof roundPlayerStateSchema>;
