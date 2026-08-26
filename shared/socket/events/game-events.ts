import type { SocketEvents } from "../events";
import { z } from "zod";
import { gameStateSchema } from "~~/shared/types/game/game";
import { playerSchema } from "~~/shared/types/game/player";

// Événements de partie envoyés par le client au serveur.
export const GameClientEvent = {
  create: "game:create",
  close: "game:close",
  exists: "game:exists",
  join: "game:join",
  start: "game:start",
} as const;

export const GameServerEvent = {
  closed: "game:closed",
  playerJoined: "game:player-joined",
  playerLeft: "game:player-left",
  started: "game:started",
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
export type GameExistsPayload = z.infer<typeof gameExistsPayloadSchema>;
export type GameExistsResponse = z.infer<typeof gameExistsResponseSchema>;
export type JoinGamePayload = z.infer<typeof joinGamePayloadSchema>;
export type JoinGameResponse = z.infer<typeof joinGameResponseSchema>;

/**
 * Événements de partie envoyés par le client au serveur.
 */
export const gameClientToServerEvents = {
  [GameClientEvent.create]: createGamePayloadSchema,
  [GameClientEvent.close]: z.void(),
  [GameClientEvent.exists]: gameExistsPayloadSchema,
  [GameClientEvent.join]: joinGamePayloadSchema,
  [GameClientEvent.start]: gameStartPayloadSchema,
} satisfies SocketEvents;

/**
 * Événements de partie envoyés par le serveur au client.
 */
export const gameServerToClientEvents = {
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
} satisfies SocketEvents;
