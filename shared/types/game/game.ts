import { z } from "zod";
import { gameSettingsSchema } from "./game-settings";
import { playerSchema } from "./player";
import { playedCardSchema } from "./played-card";
import { roundPlayerStateSchema } from "./round-player-state";

/**
 * État d'une partie visible par le client.
 *
 * Les données de jeu sensibles (deck, cartes défaussées, mains…) restent
 * exclusivement dans le modèle `Game` du serveur.
 */
export const gameStateSchema = z.object({
  id: z.string(),
  status: z.enum(["lobby", "playing", "finished"]),
  hostPlayerId: z.string(),
  players: z.array(playerSchema),
  currentPlayerId: z.string().optional(),
  round: z.number().int().nonnegative(),
  settings: gameSettingsSchema,
  playedCards: z.array(playedCardSchema),
  roundPlayerStates: z.array(roundPlayerStateSchema),
  roundWinnerIds: z.array(z.string()),
});

export type GameState = z.infer<typeof gameStateSchema>;
