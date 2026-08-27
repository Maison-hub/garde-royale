import type { CardId } from "~~/shared/game/cards";
import type { GameState } from "~~/shared/types/game/game";
import type { Deck } from "~~/server/utils/deck";

/**
 * Modèle métier interne au serveur.
 *
 * Ne jamais l'envoyer tel quel à un client : il contient l'état privé de la
 * partie. Utiliser `toGameState` pour produire le contrat partagé.
 */
export type Game = Omit<GameState, "playedCards"> & {
  deck: Deck;
  hands: Map<string, CardId[]>;
};
