import type { Server, Socket } from "socket.io";
import { gameService } from "~~/server/services/gameService";
import { turnService } from "~~/server/services/turnService";
import { roundService } from "~~/server/services/roundService";
import {
  applyCardEffect,
  getCardPrompt,
  validateCardAction,
} from "~~/server/services/cardEffectService";
import {
  broadcastCardPlayed,
  broadcastPlayerHands,
  broadcastTurnStarted,
} from "~~/server/socket/gameBroadcaster";
import type {
  ClientToServerSocketEvents,
  ServerToClientSocketEvents,
} from "~~/shared/socket/events";
import { GameClientEvent } from "~~/shared/socket/events/game-events";
import { validateSocketEvent } from "~~/shared/socket/validate-event";

export function registerTurnHandlers(
  io: Server<ClientToServerSocketEvents, ServerToClientSocketEvents>,
  socket: Socket<ClientToServerSocketEvents, ServerToClientSocketEvents>,
) {
  socket.on(GameClientEvent.getCardOptions, (payload, callback) => {
    const result = validateSocketEvent(GameClientEvent.getCardOptions, payload);

    if (!result.success) {
      callback({ success: false, error: "Les informations du tour sont invalides" });
      return;
    }

    const game = gameService.getGame(result.data.gameId);

    if (!game || game.status !== "playing") {
      callback({ success: false, error: "La partie n'est pas en cours" });
      return;
    }

    const playerId = game.currentPlayerId;

    if (!playerId || gameService.getPlayerSocketId(game.id, playerId) !== socket.id) {
      callback({ success: false, error: "Ce n'est pas votre tour" });
      return;
    }

    try {
      const card = turnService.getCardToPlay(
        game,
        playerId,
        result.data.cardIndex,
      );

      callback({
        success: true,
        prompt: getCardPrompt(game, playerId, card),
      });
    } catch (error) {
      callback({
        success: false,
        error: error instanceof Error ? error.message : "Impossible de jouer cette carte",
      });
    }
  });

  socket.on(GameClientEvent.playCard, (payload, callback) => {
    const result = validateSocketEvent(GameClientEvent.playCard, payload);

    if (!result.success) {
      callback({ success: false, error: "Les informations du tour sont invalides" });
      return;
    }

    const game = gameService.getGame(result.data.gameId);

    if (!game || game.status !== "playing") {
      callback({ success: false, error: "La partie n'est pas en cours" });
      return;
    }

    const playerId = game.currentPlayerId;

    if (!playerId || gameService.getPlayerSocketId(game.id, playerId) !== socket.id) {
      callback({ success: false, error: "Ce n'est pas votre tour" });
      return;
    }

    try {
      // Tout est vérifié avant de retirer la carte de la main.
      const card = turnService.getCardToPlay(game, playerId, result.data.cardIndex);
      validateCardAction(game, playerId, card, result.data.action);

      const playedCard = turnService.playCard(game, playerId, result.data.cardIndex);
      const effectResult = applyCardEffect(
        game,
        playerId,
        card,
        result.data.action,
      );

      const winnerIds = roundService.findRoundWinners(game);

      if (winnerIds.length > 0) {
        game.roundWinnerIds = winnerIds;
        game.currentPlayerId = undefined;
      } else {
        turnService.endTurn(game);
        turnService.startTurn(game);
      }

      broadcastCardPlayed(io, game, playedCard);
      for (const extraPlayedCard of effectResult.extraPlayedCards) {
        broadcastCardPlayed(io, game, extraPlayedCard);
      }

      broadcastPlayerHands(io, game);
      broadcastTurnStarted(io, game);

      callback({
        success: true,
        privateResult: effectResult.privateResult,
      });
    } catch (error) {
      callback({
        success: false,
        error: error instanceof Error ? error.message : "Impossible de jouer cette carte",
      });
      return;
    }
  });
}
