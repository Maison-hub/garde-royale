import type { Game } from "~~/server/types/game";
import { cards } from "~~/shared/game/cards";

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
    game.roundWinnerIds = [];
    game.deck.shuffle();
    game.deck.fireCard();
    game.hands.clear();
    game.roundPlayerStates.clear();

    for (const player of game.players) {
      game.roundPlayerStates.set(player.id, {
        eliminated: false,
        protected: false,
      });

      const card = game.deck.drawCard();

      if (!card) {
        throw new Error("Impossible de distribuer une carte : le deck est vide");
      }

      game.hands.set(player.id, [card]);
    }
  }

  /** Retourne les gagnants seulement lorsque la manche est terminée. */
  findRoundWinners(game: Game): string[] {
    const activePlayerIds = game.players
      .filter((player) => !game.roundPlayerStates.get(player.id)?.eliminated)
      .map((player) => player.id);

    if (activePlayerIds.length <= 1) {
      return activePlayerIds;
    }

    if (!game.deck.isEmpty()) {
      return [];
    }

    let highestValue = -1;
    let winnerIds: string[] = [];

    for (const playerId of activePlayerIds) {
      const card = game.hands.get(playerId)?.[0];

      if (!card) {
        continue;
      }

      const value = cards[card].value;

      if (value > highestValue) {
        highestValue = value;
        winnerIds = [playerId];
      } else if (value === highestValue) {
        winnerIds.push(playerId);
      }
    }

    return winnerIds;
  }
}

export const roundService = new RoundService();
