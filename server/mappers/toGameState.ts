import type { GameState } from "~~/shared/types/game/game";
import type { Game } from "~~/server/types/game";

/**
 * Construit l'état public d'une partie.
 *
 * La sélection champ par champ évite de divulguer accidentellement un nouveau
 * champ interne ajouté au modèle serveur.
 */
export function toGameState(game: Game): GameState {
  return {
    id: game.id,
    status: game.status,
    hostPlayerId: game.hostPlayerId,
    players: game.players,
    currentPlayerId: game.currentPlayerId,
    round: game.round,
    settings: game.settings,
    playedCards: [...game.deck.getDiscardedCards()],
    roundPlayerStates: [...game.roundPlayerStates].map(([playerId, state]) => ({
      playerId,
      eliminated: state.eliminated,
      protected: state.protected,
    })),
    roundWinnerIds: [...game.roundWinnerIds],
  };
}
