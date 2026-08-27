import type { Server, Socket } from "socket.io";
import { gameService } from "~~/server/services/gameService";
import { roundService } from "~~/server/services/roundService";
import { turnService } from "~~/server/services/turnService";
import {
  broadcastGameStarted,
  broadcastPlayerHand,
  broadcastPlayerHands,
} from "~~/server/socket/gameBroadcaster";
import { toGameState } from "~~/server/mappers/toGameState";
import type {
  ClientToServerSocketEvents,
  ServerToClientSocketEvents,
} from "~~/shared/socket/events";
import {
  GameClientEvent,
  GameServerEvent,
} from "~~/shared/socket/events/game-events";
import { validateSocketEvent } from "~~/shared/socket/validate-event";

/**
 * Enregistre les événements Socket.IO liés au cycle de vie d'une partie.
 */
export function registerGameHandlers(
  io: Server<ClientToServerSocketEvents, ServerToClientSocketEvents>,
  socket: Socket<ClientToServerSocketEvents, ServerToClientSocketEvents>,
) {
  const gamePlayers = new Map<string, string>();

  socket.on(GameClientEvent.create, (payload, callback) => {
    const result = validateSocketEvent(GameClientEvent.create, payload);

    if (!result.success) {
      console.error("Invalid game:create event", result.error.issues);
      callback({
        success: false,
        error: "Le pseudo est invalide",
      });
      return;
    }

    const player = {
      id: result.data.playerId,
      pseudo: result.data.pseudo,
    };
    const game = gameService.createGame(player, socket.id);
    gamePlayers.set(game.id, player.id);

    // create socket room for the game
    socket.join(game.id);

    callback({
      success: true,
      game: toGameState(game),
      player,
    });

  });

  socket.on(GameClientEvent.exists, (payload, callback) => {
    const result = validateSocketEvent(GameClientEvent.exists, payload);

    callback({
      exists: result.success && gameService.hasGame(result.data.gameId),
    });
  });

  socket.on(GameClientEvent.join, (payload, callback) => {
    const result = validateSocketEvent(GameClientEvent.join, payload);

    if (!result.success) {
      console.error("Invalid game:join event", result.error.issues);
      callback({
        success: false,
        error: "Les informations du joueur sont invalides",
      });
      return;
    }

    const player = {
      id: result.data.playerId,
      pseudo: result.data.pseudo,
    };

    const game = gameService.joinGame(result.data.gameId, player, socket.id);

    if (!game) {
      callback({
        success: false,
        error: "La partie n'existe pas",
      });
      return;
    }

    gamePlayers.set(game.id, player.id);

    // join socket room for the game
    socket.join(game.id);

    callback({
      success: true,
      game: toGameState(game),
      player,
    });

    // Lors d'une reconnexion, la main déjà stockée est renvoyée au joueur.
    broadcastPlayerHand(io, game, player.id);

    // Notify all players in the room that a new player has joined
    socket.to(game.id).emit(GameServerEvent.playerJoined, {
      gameId: game.id,
      player
    });
  });

  socket.on(GameClientEvent.start, (payload, callback) => {
    const result = validateSocketEvent(GameClientEvent.start, payload);

    if (!result.success) {
      console.error("Invalid game:start event", result.error.issues);
      callback({
        success: false,
        error: "Les informations de la partie sont invalides",
      });
      return;
    }

    const game = gameService.getGame(result.data.gameId);

    if (!game) {
      callback({
        success: false,
        error: "La partie n'existe pas",
      });
      return;
    }

    const currentPlayerId = gamePlayers.get(result.data.gameId);
    if (!currentPlayerId) {
      callback({
        success: false,
        error: "Vous ne participez pas à cette partie",
      });
      return;
    }
    if (currentPlayerId !== game.hostPlayerId) {
      callback({
        success: false,
        error: "Seul l'hôte peut démarrer la partie",
      });
      return;
    }

    game.status = "playing";
    roundService.startRound(game);
    turnService.startTurn(game);

    broadcastPlayerHands(io, game);
    broadcastGameStarted(io, game);

    callback({
      success: true,
    });
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room === socket.id) {
        continue;
      }

      const playerId = gamePlayers.get(room);

      if (!playerId) {
        continue;
      }

      const player = gameService.leaveGame(room, playerId, socket.id);

      if (!player) {
        continue;
      }

      socket.to(room).emit(GameServerEvent.playerLeft, {
        gameId: room,
        playerId: player.id,
      });
    }
  });

  // socket.on("game:close", () => {
  //   // Fermer une partie.
  // });
}
