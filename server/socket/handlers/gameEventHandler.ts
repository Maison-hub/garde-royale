import type { Server, Socket } from "socket.io";
import { gameService } from "~~/server/services/gameService";
import { roundService } from "~~/server/services/roundService";
import { turnService } from "~~/server/services/turnService";
import {
  broadcastGameStarted,
  broadcastCardPlayed,
  broadcastPlayerHand,
  broadcastPlayerHands,
  broadcastTurnStarted,
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
      connected: true,
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

  socket.on(GameClientEvent.syncLobby, (payload, callback) => {
    const result = validateSocketEvent(GameClientEvent.syncLobby, payload);

    if (!result.success) {
      callback({
        success: false,
        error: "L'identifiant de la partie est invalide",
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

    callback({
      success: true,
      game: toGameState(game),
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

    const requestedGame = gameService.getGame(result.data.gameId);

    if (!requestedGame) {
      callback({
        success: false,
        error: "La partie n'existe pas",
      });
      return;
    }

    if (requestedGame.excludedPlayerIds.has(result.data.playerId)) {
      callback({
        success: false,
        error: "Vous avez été exclu de cette partie",
      });
      return;
    }

    const existingPlayer = requestedGame.players.find(
      (gamePlayer) => gamePlayer.id === result.data.playerId,
    );

    if (requestedGame.status !== "lobby" && !existingPlayer) {
      callback({
        success: false,
        error: "La partie a déjà commencé",
      });
      return;
    }

    const player = {
      id: result.data.playerId,
      pseudo: result.data.pseudo,
      connected: true,
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

    if (existingPlayer) {
      socket.to(game.id).emit(GameServerEvent.playerUpdated, {
        gameId: game.id,
        player: existingPlayer,
      });
    } else {
      socket.to(game.id).emit(GameServerEvent.playerJoined, {
        gameId: game.id,
        player,
      });
    }
  });

  socket.on(GameClientEvent.kickPlayer, (payload, callback) => {
    const result = validateSocketEvent(GameClientEvent.kickPlayer, payload);

    if (!result.success) {
      callback({ success: false, error: "La demande d'exclusion est invalide" });
      return;
    }

    const game = gameService.getGame(result.data.gameId);
    const requesterId = gamePlayers.get(result.data.gameId);

    if (!game || !requesterId) {
      callback({ success: false, error: "Vous ne participez pas à cette partie" });
      return;
    }

    if (
      requesterId !== game.hostPlayerId
      || gameService.getPlayerSocketId(game.id, requesterId) !== socket.id
    ) {
      callback({ success: false, error: "Seul l'hôte peut exclure un joueur" });
      return;
    }

    if (game.roundWinnerIds.length > 0) {
      callback({ success: false, error: "La manche est déjà terminée" });
      return;
    }

    if (result.data.targetPlayerId === game.hostPlayerId) {
      callback({ success: false, error: "L'hôte ne peut pas s'exclure lui-même" });
      return;
    }

    const removedPlayer = gameService.removePlayer(
      game.id,
      result.data.targetPlayerId,
    );

    if (!removedPlayer) {
      callback({ success: false, error: "Ce joueur n'est pas dans la partie" });
      return;
    }

    if (removedPlayer.socketId) {
      io.to(removedPlayer.socketId).emit(GameServerEvent.kicked, {
        gameId: game.id,
      });
      io.sockets.sockets.get(removedPlayer.socketId)?.leave(game.id);
    }

    io.to(game.id).emit(GameServerEvent.playerLeft, {
      gameId: game.id,
      playerId: removedPlayer.player.id,
    });

    for (const playedCard of removedPlayer.playedCards) {
      broadcastCardPlayed(io, game, playedCard);
    }

    if (game.status === "playing") {
      const winnerIds = roundService.findRoundWinners(game);

      if (winnerIds.length > 0) {
        game.roundWinnerIds = winnerIds;
        game.currentPlayerId = undefined;
      } else if (removedPlayer.wasCurrentPlayer) {
        turnService.moveTurnAfterRemovedPlayer(game, removedPlayer.playerIndex);
        turnService.startTurn(game);
      }

      broadcastPlayerHands(io, game);
      broadcastTurnStarted(io, game);
    }

    callback({ success: true });
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

    if (game.status !== "lobby") {
      callback({
        success: false,
        error: "La partie a déjà commencé",
      });
      return;
    }

    if (game.players.some((player) => !player.connected)) {
      callback({
        success: false,
        error: "Tous les joueurs doivent être connectés avant de démarrer",
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
    if (
      currentPlayerId !== game.hostPlayerId
      || gameService.getPlayerSocketId(game.id, currentPlayerId) !== socket.id
    ) {
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

      const player = gameService.disconnectPlayer(room, playerId, socket.id);

      if (!player) {
        continue;
      }

      socket.to(room).emit(GameServerEvent.playerUpdated, {
        gameId: room,
        player,
      });
    }
  });

  // socket.on("game:close", () => {
  //   // Fermer une partie.
  // });
}
