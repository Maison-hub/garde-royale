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
      id: socket.id,
      pseudo: result.data.pseudo,
    };
    const game = gameService.createGame(player);

    // create socket room for the game
    socket.join(game.id);

    callback({
      success: true,
      gameId: game.id,
      player,
    });
  });

  socket.on(GameClientEvent.join, (payload) => {
    const result = validateSocketEvent(GameClientEvent.join, payload);

    if (!result.success) {
      console.error("Invalid game:join event", result.error.issues);
      return;
    }

    const player = {
      id: socket.id,
      pseudo: result.data.pseudo,
    };

    const game = gameService.joinGame(result.data.gameId, player);

    if (!game) {
      console.error("Game does not exist:", result.data.gameId);
      return;
    }

    // join socket room for the game
    socket.join(game.id);

    socket.emit(GameServerEvent.joined, {
      gameId: game.id,
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

      const player = gameService.leaveGame(room, socket.id);

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
