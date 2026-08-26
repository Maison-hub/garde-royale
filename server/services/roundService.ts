import type { Game } from "~~/server/types/game";

export class RoundService {
  /**
   * Prépare une nouvelle manche.
   * La distribution des cartes sera ajoutée ici plus tard.
   */
  startRound(game: Game) {
    const firstPlayer = game.players[0];

    if (!firstPlayer) {
      throw new Error("Impossible de démarrer une manche sans joueur");
    }

    game.round += 1;
    game.currentPlayerId = firstPlayer.id;
  }
}

export const roundService = new RoundService();
