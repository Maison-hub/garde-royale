import type { SocketEvents } from "../events";
import { z } from "zod";
import { playerSchema } from "~~/shared/game/player";

// Événements de partie envoyés par le client au serveur.
export const GameClientEvent = {
  create: "game:create",
  close: "game:close",
  join: "game:join",
} as const;

export const GameServerEvent = {
  created: "game:created",
  closed: "game:closed",
  joined: "game:joined",
  playerJoined: "game:player-joined",
} as const;


/**
 * Événements de partie envoyés par le client au serveur.
 */
export const gameClientToServerEvents = {
  // Ajouter les schémas game:create et game:close ici.
  [GameClientEvent.create]: z.object({
    pseudo: z.string().min(1),
  }),
  [GameClientEvent.close]: z.void(),
  [GameClientEvent.join]: z.object({
    gameId: z.string(),
    pseudo: z.string().min(1),
  }),
} satisfies SocketEvents;

/**
 * Événements de partie envoyés par le serveur au client.
 */
export const gameServerToClientEvents = {
  // Ajouter les schémas game:created et game:closed ici.
  [GameServerEvent.created]: z.object({
    gameId: z.string(),
    player: playerSchema,
  }),
  [GameServerEvent.playerJoined]: z.object({
    gameId: z.string(),
    player: playerSchema,
  }),
  [GameServerEvent.joined]: z.object({
    gameId: z.string(),
    players: z.array(playerSchema),
  }),
  [GameServerEvent.closed]: z.void(),
} satisfies SocketEvents;
