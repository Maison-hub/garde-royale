import { generateGameId } from "~~/server/utils/generateGameId";
import type { Game } from "~~/shared/types/game/game";
import type { GameSettings } from "~~/shared/types/game/game-settings";
import type { Player } from "~~/shared/types/game/player";

export class GameService {
  private readonly games = new Map<string, Game>(); //Map use to store current games in memory, key is gameId, value is Game object

  createGame(hostPlayer: Player, settings: GameSettings = {}): Game {
    let gameId = generateGameId();

    while (this.games.has(gameId)) {
      gameId = generateGameId();
    }

    const game: Game = {
      id: gameId,
      status: "lobby",
      hostPlayerId: hostPlayer.id,
      players: [hostPlayer],
      deck: [],
      discardedCards: [],
      round: 0,
      settings,
    };

    this.games.set(game.id, game);

    return game;
  }

  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  joinGame(gameId: string, player: Player): Game | undefined {
    const game = this.games.get(gameId);

    if (!game) {
      return undefined;
    }

    const playerAlreadyJoined = game.players.some(
      (gamePlayer) => gamePlayer.id === player.id,
    );

    if (!playerAlreadyJoined) {
      game.players.push(player);
    }

    return game;
  }

  leaveGame(gameId: string, playerId: string): Player | undefined {
    const game = this.games.get(gameId);

    if (!game) {
      return undefined;
    }

    const playerIndex = game.players.findIndex(
      (player) => player.id === playerId,
    );

    if (playerIndex === -1) {
      return undefined;
    }

    const [player] = game.players.splice(playerIndex, 1);

    if (!player) {
      return undefined;
    }

    if (game.players.length === 0) {
      this.games.delete(gameId);
      return player;
    }

    if (game.hostPlayerId === playerId) {
      game.hostPlayerId = game.players[0]!.id;
    }

    if (game.currentPlayerId === playerId) {
      game.currentPlayerId = game.players[0]?.id;
    }

    return player;
  }
}

export const gameService = new GameService();
