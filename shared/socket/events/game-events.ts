import type { SocketEvents } from "../events";
import { z } from "zod";
import { cardIdSchema } from "~~/shared/game/cards";
import { gameStateSchema } from "~~/shared/types/game/game";
import { playerSchema } from "~~/shared/types/game/player";
import { playedCardSchema } from "~~/shared/types/game/played-card";
import {
  cardActionSchema,
  cardPromptSchema,
  privateEffectResultSchema,
} from "~~/shared/types/game/card-action";

// Événements de partie envoyés par le client au serveur.
export const GameClientEvent = {
  create: "game:create",
  close: "game:close",
  exists: "game:exists",
  join: "game:join",
  syncLobby: "game:lobby-sync",
  start: "game:start",
  getCardOptions: "game:get-card-options",
  playCard: "game:play-card",
} as const;

export const GameServerEvent = {
  cardPlayed: "game:card-played",
  closed: "game:closed",
  handUpdated: "game:hand-updated",
  playerJoined: "game:player-joined",
  playerLeft: "game:player-left",
  started: "game:started",
  turnStarted: "game:turn-started",
} as const;

export const createGamePayloadSchema = z.object({
  playerId: z.string().min(1),
  pseudo: z.string().min(1),
});

export const createGameResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    game: gameStateSchema,
    player: playerSchema,
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

export const joinGamePayloadSchema = z.object({
  gameId: z.string(),
  playerId: z.string().min(1),
  pseudo: z.string().min(1),
});

export const joinGameResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    game: gameStateSchema,
    player: playerSchema,
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

export const lobbySyncPayloadSchema = z.object({
  gameId: z.string().min(1),
});

export const lobbySyncResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    game: gameStateSchema,
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

export const gameStartPayloadSchema = z.object({
  gameId: z.string(),
});

export const gameStartResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

export const playCardPayloadSchema = z.object({
  gameId: z.string().min(1),
  cardIndex: z.number().int().min(0).max(1),
  action: cardActionSchema,
});

export const playCardResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    privateResult: privateEffectResultSchema.optional(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

export const getCardOptionsPayloadSchema = z.object({
  gameId: z.string().min(1),
  cardIndex: z.number().int().min(0).max(1),
});

export const getCardOptionsResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    prompt: cardPromptSchema,
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

export const gameExistsPayloadSchema = z.object({
  gameId: z.string().min(1),
});

export const gameExistsResponseSchema = z.object({
  exists: z.boolean(),
});

export type CreateGamePayload = z.infer<typeof createGamePayloadSchema>;
export type CreateGameResponse = z.infer<typeof createGameResponseSchema>;
export type GameStartPayload = z.infer<typeof gameStartPayloadSchema>;
export type GameStartResponse = z.infer<typeof gameStartResponseSchema>;
export type PlayCardPayload = z.infer<typeof playCardPayloadSchema>;
export type PlayCardResponse = z.infer<typeof playCardResponseSchema>;
export type GetCardOptionsPayload = z.infer<typeof getCardOptionsPayloadSchema>;
export type GetCardOptionsResponse = z.infer<typeof getCardOptionsResponseSchema>;
export type GameExistsPayload = z.infer<typeof gameExistsPayloadSchema>;
export type GameExistsResponse = z.infer<typeof gameExistsResponseSchema>;
export type JoinGamePayload = z.infer<typeof joinGamePayloadSchema>;
export type JoinGameResponse = z.infer<typeof joinGameResponseSchema>;
export type LobbySyncPayload = z.infer<typeof lobbySyncPayloadSchema>;
export type LobbySyncResponse = z.infer<typeof lobbySyncResponseSchema>;

/**
 * Événements de partie envoyés par le client au serveur.
 */
export const gameClientToServerEvents = {
  [GameClientEvent.create]: createGamePayloadSchema,
  [GameClientEvent.close]: z.void(),
  [GameClientEvent.exists]: gameExistsPayloadSchema,
  [GameClientEvent.join]: joinGamePayloadSchema,
  [GameClientEvent.syncLobby]: lobbySyncPayloadSchema,
  [GameClientEvent.start]: gameStartPayloadSchema,
  [GameClientEvent.getCardOptions]: getCardOptionsPayloadSchema,
  [GameClientEvent.playCard]: playCardPayloadSchema,
} satisfies SocketEvents;

/**
 * Événements de partie envoyés par le serveur au client.
 */
export const gameServerToClientEvents = {
  [GameServerEvent.cardPlayed]: z.object({
    gameId: z.string(),
    playedCard: playedCardSchema,
  }),
  [GameServerEvent.handUpdated]: z.object({
    cards: z.array(cardIdSchema),
  }),
  [GameServerEvent.playerJoined]: z.object({
    gameId: z.string(),
    player: playerSchema,
  }),
  [GameServerEvent.playerLeft]: z.object({
    gameId: z.string(),
    playerId: z.string(),
  }),
  [GameServerEvent.closed]: z.void(),
  [GameServerEvent.started]: z.object({
    game: gameStateSchema,
  }),
  [GameServerEvent.turnStarted]: z.object({
    game: gameStateSchema,
  }),
} satisfies SocketEvents;
