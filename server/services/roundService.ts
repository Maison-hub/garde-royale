import type { Game } from "~~/server/types/game";

export class RoundService {
  /**
   * Prépare une nouvelle manche et distribue la carte initiale de chaque joueur.
   */
  startRound(game: Game) {
    const firstPlayer = game.players[0];

    if (!firstPlayer) {
      throw new Error("Impossible de démarrer une manche sans joueur");
    }

    game.round += 1;
    game.currentPlayerId = firstPlayer.id;
    game.deck.shuffle();
    game.deck.fireCard();
    game.hands.clear();

    for (const player of game.players) {
      const card = game.deck.drawCard();

      if (!card) {
        throw new Error("Impossible de distribuer une carte : le deck est vide");
      }

      game.hands.set(player.id, [card]);
    }
  }
}

export const roundService = new RoundService();
