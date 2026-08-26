import { generateGameId } from "~~/server/utils/generateGameId";
import type { Game } from "~~/server/types/game";
import type { GameSettings } from "~~/shared/types/game/game-settings";
import type { Player } from "~~/shared/types/game/player";
import { Deck } from "~~/server/utils/deck";

export class GameService {
  private readonly games = new Map<string, Game>(); //Map use to store current games in memory, key is gameId, value is Game object
  private readonly playerSocketIds = new Map<string, string>();

  createGame(
    hostPlayer: Player,
    socketId: string,
    settings: GameSettings = {},
  ): Game {
    let gameId = generateGameId();

    while (this.games.has(gameId)) {
      gameId = generateGameId();
    }

    const game: Game = {
      id: gameId,
      status: "lobby",
      hostPlayerId: hostPlayer.id,
      players: [hostPlayer],
      deck: new Deck(),
      discardedCards: [],
      round: 0,
      settings,
    };

    this.games.set(game.id, game);
    this.playerSocketIds.set(this.getPlayerKey(game.id, hostPlayer.id), socketId);

    return game;
  }

  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  hasGame(gameId: string): boolean {
    return this.games.has(gameId);
  }

  joinGame(gameId: string, player: Player, socketId: string): Game | undefined {
    const game = this.games.get(gameId);

    if (!game) {
      return undefined;
    }

    const existingPlayer = game.players.find(
      (gamePlayer) => gamePlayer.id === player.id,
    );

    if (existingPlayer) {
      existingPlayer.pseudo = player.pseudo;
    } else {
      game.players.push(player);
    }

    this.playerSocketIds.set(this.getPlayerKey(gameId, player.id), socketId);

    return game;
  }

  leaveGame(
    gameId: string,
    playerId: string,
    socketId: string,
  ): Player | undefined {
    const game = this.games.get(gameId);

    if (!game) {
      return undefined;
    }

    const playerKey = this.getPlayerKey(gameId, playerId);

    if (this.playerSocketIds.get(playerKey) !== socketId) {
      return undefined;
    }

    this.playerSocketIds.delete(playerKey);

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

    return player;
  }

  private getPlayerKey(gameId: string, playerId: string): string {
    return `${gameId}:${playerId}`;
  }
}

export const gameService = new GameService();
