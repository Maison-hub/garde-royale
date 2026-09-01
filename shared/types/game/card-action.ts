import { z } from "zod";
import { cardIdSchema } from "~~/shared/game/cards";

/** Les informations que le joueur peut envoyer avec une carte. */
export const cardActionSchema = z.object({
  targetPlayerId: z.string().min(1).optional(),
  guessedCard: cardIdSchema.optional(),
});

export type CardAction = z.infer<typeof cardActionSchema>;

/** Les choix que le serveur demande d'afficher au joueur. */
export const cardPromptSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("none"),
    message: z.string(),
  }),
  z.object({
    kind: z.literal("target"),
    message: z.string(),
    targetPlayerIds: z.array(z.string()),
  }),
  z.object({
    kind: z.literal("guard"),
    message: z.string(),
    targetPlayerIds: z.array(z.string()),
    allowedCards: z.array(cardIdSchema),
  }),
]);

export type CardPrompt = z.infer<typeof cardPromptSchema>;

/** Résultat secret connu uniquement du joueur qui a joué la carte. */
export const privateEffectResultSchema = z.object({
  kind: z.literal("revealed-card"),
  targetPlayerId: z.string(),
  card: cardIdSchema,
});

export type PrivateEffectResult = z.infer<typeof privateEffectResultSchema>;
