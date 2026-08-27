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

    const card = game.deck.drawCard();

    if (!card) {
      throw new Error("Impossible de piocher une carte : le deck est vide");
    }

    hand.push(card);
  }

  /** Joue une des deux cartes du joueur actif et conserve l'autre en main. */
  playCard(game: Game, playerId: string, cardIndex: number): CardId {
    if (game.currentPlayerId !== playerId) {
      throw new Error("Ce n'est pas le tour de ce joueur");
    }

    const hand = game.hands.get(playerId);

    if (!hand || hand.length !== 2) {
      throw new Error("Le joueur actif doit avoir exactement deux cartes");
    }

    const playedCard = hand[cardIndex];

    if (!playedCard) {
      throw new Error("La carte choisie est invalide");
    }

    hand.splice(cardIndex, 1);
    game.deck.discardCard(playedCard);

    return playedCard;
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

    const nextPlayer = game.players[(currentPlayerIndex + 1) % game.players.length];

    if (!nextPlayer) {
      throw new Error("Impossible de trouver le joueur suivant");
    }

    game.currentPlayerId = nextPlayer.id;

    return nextPlayer.id;
  }
}

export const turnService = new TurnService();
