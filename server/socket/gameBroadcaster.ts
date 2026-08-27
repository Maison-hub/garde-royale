import type { Server } from "socket.io";
import type { CardId } from "~~/shared/game/cards";
import type {
  ClientToServerSocketEvents,
  ServerToClientSocketEvents,
} from "~~/shared/socket/events";
import { gameService } from "~~/server/services/gameService";
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

/** Informe tout le salon de l'identité du joueur dont le tour commence. */
export function broadcastTurnStarted(
  io: Server<ClientToServerSocketEvents, ServerToClientSocketEvents>,
  game: Game,
) {
  io.to(game.id).emit(GameServerEvent.turnStarted, {
    game: toGameState(game),
  });
}

/** Rend publique la carte jouée, mais jamais la carte conservée. */
export function broadcastCardPlayed(
  io: Server<ClientToServerSocketEvents, ServerToClientSocketEvents>,
  game: Game,
  playerId: string,
  card: CardId,
) {
  io.to(game.id).emit(GameServerEvent.cardPlayed, {
    gameId: game.id,
    playerId,
    card,
  });
}

/** Envoie la main uniquement au joueur auquel elle appartient. */
export function broadcastPlayerHand(
  io: Server<ClientToServerSocketEvents, ServerToClientSocketEvents>,
  game: Game,
  playerId: string,
) {
  const socketId = gameService.getPlayerSocketId(game.id, playerId);
  const cards = game.hands.get(playerId);

  if (!socketId || !cards) {
    return;
  }

  io.to(socketId).emit(GameServerEvent.handUpdated, {
    cards: [...cards],
  });
}

/** Envoie chaque main au propriétaire correspondant, jamais au salon entier. */
export function broadcastPlayerHands(
  io: Server<ClientToServerSocketEvents, ServerToClientSocketEvents>,
  game: Game,
) {
  for (const player of game.players) {
    broadcastPlayerHand(io, game, player.id);
  }
}
