import type { z } from "zod";
import {
  gameClientToServerEvents,
  gameServerToClientEvents,
} from "./events/game-events";

// This file register all the socket handlers

export type SocketEvents = Record<string, z.ZodType>;

export type SocketEventHandlers<TEvents extends SocketEvents> = {
  [TEvent in keyof TEvents]: (
    payload: z.output<TEvents[TEvent]>
  ) => void;
};

export type ClientToServerSocketEvents =
  SocketEventHandlers<typeof clientToServerEvents>;

export type ServerToClientSocketEvents =
  SocketEventHandlers<typeof serverToClientEvents>;

/**
 * Événements envoyés par le client au serveur.
 */
export const clientToServerEvents = {
  ...gameClientToServerEvents,
} satisfies SocketEvents;

/**
 * Événements envoyés par le serveur au client.
 */
export const serverToClientEvents = {
  ...gameServerToClientEvents,
} satisfies SocketEvents;
