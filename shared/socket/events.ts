import type { z } from "zod";
import {
  GameClientEvent,
  gameClientToServerEvents,
  gameServerToClientEvents,
  type CreateGamePayload,
  type CreateGameResponse,
  type JoinGamePayload,
} from "./events/game-events";

// This file register all the socket handlers

export type SocketEvents = Record<string, z.ZodType>;

export type SocketEventHandlers<TEvents extends SocketEvents> = {
  [TEvent in keyof TEvents]: (
    payload: z.output<TEvents[TEvent]>
  ) => void;
};

export type ClientToServerSocketEvents = {
  [GameClientEvent.create]: (
    payload: CreateGamePayload,
    callback: (response: CreateGameResponse) => void,
  ) => void;
  [GameClientEvent.close]: () => void;
  [GameClientEvent.join]: (payload: JoinGamePayload) => void;
};

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
