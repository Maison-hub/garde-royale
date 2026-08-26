import type { Server, Socket } from "socket.io";
import { generateGameId } from "~~/server/utils/generateGameId";
import type {
  ClientToServerSocketEvents,
  ServerToClientSocketEvents,
} from "~~/shared/socket/events";
import { GameClientEvent, GameServerEvent } from "~~/shared/socket/events/game-events";
import { validateSocketEvent } from "~~/shared/socket/validate-event";

/**
 * Enregistre les événements Socket.IO liés au cycle de vie d'une partie.
 */
export function registerGameHandlers(
  io: Server<ClientToServerSocketEvents, ServerToClientSocketEvents>,
  socket: Socket<ClientToServerSocketEvents, ServerToClientSocketEvents>,
) {

  socket.on(GameClientEvent.create, (payload) => {
    const result = validateSocketEvent(GameClientEvent.create, payload);

    if (!result.success) {
      console.error("Invalid game:create event", result.error.issues);
      return;
    }

    console.log("Game created:", result.data.pseudo);
    const gameId = generateGameId();
    const player = {
      id: socket.id,
      pseudo: result.data.pseudo,
    };

    socket.data.pseudo = player.pseudo;

    // create socket room for the game
    socket.join(gameId);

    socket.emit(GameServerEvent.created, { gameId, player });
  });

  socket.on(GameClientEvent.join, (payload) => {
    const result = validateSocketEvent(GameClientEvent.join, payload);

    if (!result.success) {
      console.error("Invalid game:join event", result.error.issues);
      return;
    }

    // console.log("Game joined:", result.data.pseudo, "to gameId:", result.data.gameId);
    const player = {
      id: socket.id,
      pseudo: result.data.pseudo,
    };

    socket.data.pseudo = player.pseudo;

    // Vérifie que la room de la partie existe.
    const roomExists = io.sockets.adapter.rooms.has(result.data.gameId);

    if (!roomExists) {
      console.error("Game room does not exist:", result.data.gameId);
      console.error("Available rooms:", Array.from(io.sockets.adapter.rooms.keys()));
      return;
    }
    // join socket room for the game
    socket.join(result.data.gameId);

    socket.emit(GameServerEvent.joined, { gameId: result.data.gameId, players: Array.from(io.sockets.adapter.rooms.get(result.data.gameId) ?? []).map((socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      return {
        id: socket?.id ?? "",
        pseudo: socket?.data.pseudo ?? "",
      };
    }) });

    // Notify all players in the room that a new player has joined
    socket.to(result.data.gameId).emit(GameServerEvent.playerJoined, {
      gameId: result.data.gameId,
      player,
    });

  });

  // socket.on("game:close", () => {
  //   // Fermer une partie.
  // });
}
