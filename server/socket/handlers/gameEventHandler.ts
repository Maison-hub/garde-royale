import type { Socket } from "socket.io";
import { gameService } from "~~/server/services/gameService";
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
      gameId: game.id,
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
      gameId: game.id,
      player,
      players: game.players,
    });

    // Notify all players in the room that a new player has joined
    socket.to(game.id).emit(GameServerEvent.playerJoined, {
      gameId: game.id,
      player,
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
