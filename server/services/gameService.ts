import { generateGameId } from "~~/server/utils/generateGameId";
import type { Game } from "~~/server/types/game";
import type { GameSettings } from "~~/shared/types/game/game-settings";
import type { Player } from "~~/shared/types/game/player";
import type { PlayedCard } from "~~/shared/types/game/played-card";
import { Deck } from "~~/server/utils/deck";

export type RemovedPlayer = {
  player: Player;
  playerIndex: number;
  socketId?: string;
  playedCards: PlayedCard[];
  wasCurrentPlayer: boolean;
};

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
      hands: new Map(),
      excludedPlayerIds: new Set(),
      roundPlayerStates: new Map(),
      roundWinnerIds: [],
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

  getPlayerSocketId(gameId: string, playerId: string): string | undefined {
    return this.playerSocketIds.get(this.getPlayerKey(gameId, playerId));
  }

  joinGame(gameId: string, player: Player, socketId: string): Game | undefined {
    const game = this.games.get(gameId);

    if (!game || game.excludedPlayerIds.has(player.id)) {
      return undefined;
    }

    const existingPlayer = game.players.find(
      (gamePlayer) => gamePlayer.id === player.id,
    );

    if (existingPlayer) {
      existingPlayer.pseudo = player.pseudo;
      existingPlayer.connected = true;
    } else {
      game.players.push({ ...player, connected: true });
    }

    this.playerSocketIds.set(this.getPlayerKey(gameId, player.id), socketId);

    return game;
  }

  /** Garde le joueur dans la partie, mais le marque comme déconnecté. */
  disconnectPlayer(
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

    const player = game.players.find(
      (player) => player.id === playerId,
    );

    if (!player) {
      return undefined;
    }

    player.connected = false;
    return player;
  }

  /** Retire réellement un joueur de la partie. Utilisé par l'hôte. */
  removePlayer(gameId: string, playerId: string): RemovedPlayer | undefined {
    const game = this.games.get(gameId);

    if (!game) {
      return undefined;
    }

    const playerIndex = game.players.findIndex(
      (player) => player.id === playerId,
    );
    const player = game.players[playerIndex];

    if (!player) {
      return undefined;
    }

    const socketId = this.playerSocketIds.get(
      this.getPlayerKey(gameId, playerId),
    );
    const wasCurrentPlayer = game.currentPlayerId === playerId;
    const hand = game.hands.get(playerId) ?? [];
    const playedCards = hand.map((card) => ({
      card,
      playerId,
      round: game.round,
    }));

    for (const playedCard of playedCards) {
      game.deck.discardCard(playedCard);
    }

    game.players.splice(playerIndex, 1);
    game.hands.delete(playerId);
    game.roundPlayerStates.delete(playerId);
    game.excludedPlayerIds.add(playerId);
    this.playerSocketIds.delete(this.getPlayerKey(gameId, playerId));

    return {
      player,
      playerIndex,
      socketId,
      playedCards,
      wasCurrentPlayer,
    };
  }

  private getPlayerKey(gameId: string, playerId: string): string {
    return `${gameId}:${playerId}`;
  }
}

export const gameService = new GameService();
