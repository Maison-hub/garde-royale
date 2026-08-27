import type { Server, Socket } from "socket.io";
import { gameService } from "~~/server/services/gameService";
import { turnService } from "~~/server/services/turnService";
import {
  broadcastCardPlayed,
  broadcastPlayerHand,
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
      const playedCard = turnService.playCard(game, playerId, result.data.cardIndex);

      // Les effets ciblés seront résolus ici avant d'avancer le tour.
      const nextPlayerId = turnService.endTurn(game);
      turnService.startTurn(game);

      broadcastCardPlayed(io, game, playerId, playedCard);
      broadcastPlayerHand(io, game, playerId);
      broadcastPlayerHand(io, game, nextPlayerId);
    } catch (error) {
      callback({
        success: false,
        error: error instanceof Error ? error.message : "Impossible de jouer cette carte",
      });
      return;
    }

    broadcastTurnStarted(io, game);

    callback({ success: true });
  });
}
