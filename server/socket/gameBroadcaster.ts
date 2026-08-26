import type { Server } from "socket.io";
import type {
  ClientToServerSocketEvents,
  ServerToClientSocketEvents,
} from "~~/shared/socket/events";
import { GameServerEvent } from "~~/shared/socket/events/game-events";
import { toGameState } from "~~/server/mappers/toGameState";
import type { Game } from "~~/server/types/game";

/**
 * Envoie les événements de partie aux joueurs concernés.
 */
export function broadcastGameStarted(
  io: Server<ClientToServerSocketEvents, ServerToClientSocketEvents>,
  game: Game,
) {
  io.to(game.id).emit(GameServerEvent.started, {
    game: toGameState(game),
  });
}
