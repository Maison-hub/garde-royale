import { cards, type CardId } from "~~/shared/game/cards";
import type {
  CardAction,
  CardPrompt,
  PrivateEffectResult,
} from "~~/shared/types/game/card-action";
import type { PlayedCard } from "~~/shared/types/game/played-card";
import type { Game } from "~~/server/types/game";

type EffectContext = {
  game: Game;
  actorId: string;
};

export type EffectResult = {
  extraPlayedCards: PlayedCard[];
  privateResult?: PrivateEffectResult;
};

type CardEffect = {
  getPrompt: (context: EffectContext) => CardPrompt;
  validate: (context: EffectContext, action: CardAction) => void;
  apply: (context: EffectContext, action: CardAction) => EffectResult;
};

function emptyResult(): EffectResult {
  return { extraPlayedCards: [] };
}

function getPlayerState(game: Game, playerId: string) {
  const state = game.roundPlayerStates.get(playerId);

  if (!state) {
    throw new Error("Ce joueur ne participe pas à la manche");
  }

  return state;
}

/** Retourne uniquement les joueurs que la carte a le droit de cibler. */
function getLegalTargetIds(context: EffectContext, allowSelf: boolean): string[] {
  return context.game.players
    .filter((player) => {
      const state = context.game.roundPlayerStates.get(player.id);

      if (!state || state.eliminated) {
        return false;
      }

      if (player.id === context.actorId) {
        return allowSelf;
      }

      return !state.protected;
    })
    .map((player) => player.id);
}

/**
 * Vérifie le choix de la cible. Quand aucune cible n'est possible, la carte
 * peut tout de même être jouée, mais son effet ne fait rien.
 */
function validateTarget(
  context: EffectContext,
  action: CardAction,
  allowSelf: boolean,
) {
  const legalTargetIds = getLegalTargetIds(context, allowSelf);

  if (legalTargetIds.length === 0) {
    if (action.targetPlayerId) {
      throw new Error("Cette carte n'a aucune cible disponible");
    }

    return;
  }

  if (!action.targetPlayerId) {
    throw new Error("Vous devez choisir un joueur");
  }

  if (!legalTargetIds.includes(action.targetPlayerId)) {
    throw new Error("Ce joueur ne peut pas être ciblé");
  }
}

function makeTargetPrompt(
  context: EffectContext,
  message: string,
  allowSelf = false,
): CardPrompt {
  const targetPlayerIds = getLegalTargetIds(context, allowSelf);

  if (targetPlayerIds.length === 0) {
    return {
      kind: "none",
      message: "Aucune cible n'est disponible. La carte sera jouée sans effet.",
    };
  }

  return {
    kind: "target",
    message,
    targetPlayerIds,
  };
}

function discardHand(game: Game, playerId: string): PlayedCard[] {
  const hand = game.hands.get(playerId) ?? [];
  const playedCards = hand.map((card) => ({
    card,
    playerId,
    round: game.round,
  }));

  hand.splice(0, hand.length);

  for (const playedCard of playedCards) {
    game.deck.discardCard(playedCard);
  }

  return playedCards;
}

function eliminatePlayer(game: Game, playerId: string): PlayedCard[] {
  const state = getPlayerState(game, playerId);

  if (state.eliminated) {
    return [];
  }

  state.eliminated = true;
  state.protected = false;
  return discardHand(game, playerId);
}

const guardCards = (Object.keys(cards) as CardId[]).filter(
  (card) => card !== "garde",
);

const cardEffects: Record<CardId, CardEffect> = {
  garde: {
    getPrompt(context) {
      const targetPlayerIds = getLegalTargetIds(context, false);

      if (targetPlayerIds.length === 0) {
        return {
          kind: "none",
          message: "Aucune cible n'est disponible. Le Garde sera joué sans effet.",
        };
      }

      return {
        kind: "guard",
        message: "Choisis un joueur et devine sa carte.",
        targetPlayerIds,
        allowedCards: guardCards,
      };
    },

    validate(context, action) {
      validateTarget(context, action, false);

      if (getLegalTargetIds(context, false).length === 0) {
        return;
      }

      if (!action.guessedCard || action.guessedCard === "garde") {
        throw new Error("Vous devez choisir une carte autre que le Garde");
      }
    },

    apply(context, action) {
      if (!action.targetPlayerId || !action.guessedCard) {
        return emptyResult();
      }

      const targetCard = context.game.hands.get(action.targetPlayerId)?.[0];

      if (targetCard !== action.guessedCard) {
        return emptyResult();
      }

      return {
        extraPlayedCards: eliminatePlayer(
          context.game,
          action.targetPlayerId,
        ),
      };
    },
  },

  pretre: {
    getPrompt(context) {
      return makeTargetPrompt(context, "Choisis la main que tu veux regarder.");
    },

    validate(context, action) {
      validateTarget(context, action, false);
    },

    apply(context, action) {
      if (!action.targetPlayerId) {
        return emptyResult();
      }

      const card = context.game.hands.get(action.targetPlayerId)?.[0];

      if (!card) {
        return emptyResult();
      }

      return {
        extraPlayedCards: [],
        privateResult: {
          kind: "revealed-card",
          targetPlayerId: action.targetPlayerId,
          card,
        },
      };
    },
  },

  baron: {
    getPrompt(context) {
      return makeTargetPrompt(context, "Choisis le joueur avec qui comparer ta main.");
    },

    validate(context, action) {
      validateTarget(context, action, false);
    },

    apply(context, action) {
      if (!action.targetPlayerId) {
        return emptyResult();
      }

      const actorCard = context.game.hands.get(context.actorId)?.[0];
      const targetCard = context.game.hands.get(action.targetPlayerId)?.[0];

      if (!actorCard || !targetCard || cards[actorCard].value === cards[targetCard].value) {
        return emptyResult();
      }

      const eliminatedPlayerId = cards[actorCard].value < cards[targetCard].value
        ? context.actorId
        : action.targetPlayerId;

      return {
        extraPlayedCards: eliminatePlayer(context.game, eliminatedPlayerId),
      };
    },
  },

  servante: {
    getPrompt() {
      return {
        kind: "none",
        message: "Tu seras protégé jusqu'au début de ton prochain tour.",
      };
    },

    validate() {},

    apply(context) {
      getPlayerState(context.game, context.actorId).protected = true;
      return emptyResult();
    },
  },

  prince: {
    getPrompt(context) {
      return makeTargetPrompt(
        context,
        "Choisis un joueur qui devra défausser sa carte.",
        true,
      );
    },

    validate(context, action) {
      validateTarget(context, action, true);
    },

    apply(context, action) {
      if (!action.targetPlayerId) {
        return emptyResult();
      }

      const targetId = action.targetPlayerId;
      const discardedCards = discardHand(context.game, targetId);
      const discardedPrincess = discardedCards.some(
        (playedCard) => playedCard.card === "princesse",
      );

      if (discardedPrincess) {
        const state = getPlayerState(context.game, targetId);
        state.eliminated = true;
        state.protected = false;
        return { extraPlayedCards: discardedCards };
      }

      const replacementCard = context.game.deck.drawReplacementCard();

      if (replacementCard) {
        context.game.hands.get(targetId)?.push(replacementCard);
      }

      return { extraPlayedCards: discardedCards };
    },
  },

  roi: {
    getPrompt(context) {
      return makeTargetPrompt(context, "Choisis le joueur avec qui échanger ta main.");
    },

    validate(context, action) {
      validateTarget(context, action, false);
    },

    apply(context, action) {
      if (!action.targetPlayerId) {
        return emptyResult();
      }

      const actorHand = context.game.hands.get(context.actorId);
      const targetHand = context.game.hands.get(action.targetPlayerId);

      if (!actorHand || !targetHand) {
        return emptyResult();
      }

      context.game.hands.set(context.actorId, targetHand);
      context.game.hands.set(action.targetPlayerId, actorHand);
      return emptyResult();
    },
  },

  comtesse: {
    getPrompt() {
      return { kind: "none", message: "La Comtesse n'a pas d'effet." };
    },

    validate() {},
    apply: emptyResult,
  },

  princesse: {
    getPrompt() {
      return {
        kind: "none",
        message: "Jouer la Princesse t'éliminera de cette manche.",
      };
    },

    validate() {},

    apply(context) {
      return {
        extraPlayedCards: eliminatePlayer(context.game, context.actorId),
      };
    },
  },
};

export function getCardPrompt(
  game: Game,
  actorId: string,
  card: CardId,
): CardPrompt {
  return cardEffects[card].getPrompt({ game, actorId });
}

export function validateCardAction(
  game: Game,
  actorId: string,
  card: CardId,
  action: CardAction,
) {
  cardEffects[card].validate({ game, actorId }, action);
}

export function applyCardEffect(
  game: Game,
  actorId: string,
  card: CardId,
  action: CardAction,
): EffectResult {
  return cardEffects[card].apply({ game, actorId }, action);
}
