import type { SocketEvents } from "../events";
import { z } from "zod";
import { playerSchema } from "~~/shared/types/game/player";

// Événements de partie envoyés par le client au serveur.
export const GameClientEvent = {
  create: "game:create",
  close: "game:close",
  join: "game:join",
} as const;

export const GameServerEvent = {
  closed: "game:closed",
  joined: "game:joined",
  playerJoined: "game:player-joined",
  playerLeft: "game:player-left",
} as const;

export const createGamePayloadSchema = z.object({
  pseudo: z.string().min(1),
});

export const createGameResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    gameId: z.string(),
    player: playerSchema,
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

export const joinGamePayloadSchema = z.object({
  gameId: z.string(),
  pseudo: z.string().min(1),
});

export type CreateGamePayload = z.infer<typeof createGamePayloadSchema>;
export type CreateGameResponse = z.infer<typeof createGameResponseSchema>;
export type JoinGamePayload = z.infer<typeof joinGamePayloadSchema>;

/**
 * Événements de partie envoyés par le client au serveur.
 */
export const gameClientToServerEvents = {
  [GameClientEvent.create]: createGamePayloadSchema,
  [GameClientEvent.close]: z.void(),
  [GameClientEvent.join]: joinGamePayloadSchema,
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
  [GameServerEvent.joined]: z.object({
    gameId: z.string(),
    players: z.array(playerSchema),
  }),
  [GameServerEvent.closed]: z.void(),
} satisfies SocketEvents;
