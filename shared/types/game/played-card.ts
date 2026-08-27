import { z } from "zod";
import { cardIdSchema } from "~~/shared/game/cards";

/** Information publique sur une carte jouée. */
export const playedCardSchema = z.object({
  card: cardIdSchema,
  playerId: z.string(),
  round: z.number().int().nonnegative(),
});

export type PlayedCard = z.infer<typeof playedCardSchema>;
