import type { PlayedCard } from "~~/shared/types/game/played-card";
import type { CardId } from "~~/shared/game/cards";
import type { Game } from "~~/server/types/game";

/** Gère le cycle d'un tour sans exposer les mains aux clients. */
export class TurnService {
  /** Le joueur actif pioche sa seconde carte. */
  startTurn(game: Game) {
    const playerId = game.currentPlayerId;

    if (!playerId) {
      throw new Error("Impossible de démarrer un tour sans joueur actif");
    }

    const hand = game.hands.get(playerId);

    if (!hand || hand.length !== 1) {
      throw new Error("Le joueur actif doit avoir exactement une carte");
    }

    const playerState = game.roundPlayerStates.get(playerId);

    if (!playerState || playerState.eliminated) {
      throw new Error("Le joueur actif est éliminé de cette manche");
    }

    // La protection de la Servante se termine au début du prochain tour.
    playerState.protected = false;

    const card = game.deck.drawCard();

    if (!card) {
      throw new Error("Impossible de piocher une carte : le deck est vide");
    }

    hand.push(card);
  }

  /** Joue une des deux cartes du joueur actif et conserve l'autre en main. */
  playCard(game: Game, playerId: string, cardIndex: number): PlayedCard {
    const card = this.getCardToPlay(game, playerId, cardIndex);
    const hand = game.hands.get(playerId)!;

    hand.splice(cardIndex, 1);
    const playedCard = {
      card,
      playerId,
      round: game.round,
    };
    game.deck.discardCard(playedCard);

    return playedCard;
  }

  /** Vérifie qu'une carte peut être jouée, sans modifier la partie. */
  getCardToPlay(game: Game, playerId: string, cardIndex: number): CardId {
    if (game.currentPlayerId !== playerId) {
      throw new Error("Ce n'est pas le tour de ce joueur");
    }

    if (game.roundWinnerIds.length > 0) {
      throw new Error("Cette manche est terminée");
    }

    if (game.roundPlayerStates.get(playerId)?.eliminated) {
      throw new Error("Ce joueur est éliminé de la manche");
    }

    const hand = game.hands.get(playerId);

    if (!hand || hand.length !== 2) {
      throw new Error("Le joueur actif doit avoir exactement deux cartes");
    }

    const card = hand[cardIndex];

    if (!card) {
      throw new Error("La carte choisie est invalide");
    }

    const mustPlayCountess = hand.includes("comtesse")
      && (hand.includes("roi") || hand.includes("prince"));

    if (mustPlayCountess && card !== "comtesse") {
      throw new Error("Vous devez jouer la Comtesse avec un Roi ou un Prince");
    }

    return card;
  }

  /** Passe le tour au joueur suivant et retourne son identifiant. */
  endTurn(game: Game): string {
    const currentPlayerId = game.currentPlayerId;

    if (!currentPlayerId) {
      throw new Error("Impossible de terminer un tour sans joueur actif");
    }

    const currentPlayerIndex = game.players.findIndex(
      (player) => player.id === currentPlayerId,
    );

    if (currentPlayerIndex === -1) {
      throw new Error("Le joueur actif ne participe pas à cette partie");
    }

    let nextPlayer;

    for (let distance = 1; distance <= game.players.length; distance += 1) {
      const candidate = game.players[
        (currentPlayerIndex + distance) % game.players.length
      ];

      if (candidate && !game.roundPlayerStates.get(candidate.id)?.eliminated) {
        nextPlayer = candidate;
        break;
      }
    }

    if (!nextPlayer) {
      throw new Error("Impossible de trouver le joueur suivant");
    }

    game.currentPlayerId = nextPlayer.id;

    return nextPlayer.id;
  }
}

export const turnService = new TurnService();
