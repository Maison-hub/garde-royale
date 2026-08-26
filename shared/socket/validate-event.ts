import { clientToServerEvents } from "./events";
import type { z } from "zod";

type ClientToServerEvents = typeof clientToServerEvents;
type EventPayload<TEvent extends keyof ClientToServerEvents> = z.output<
  ClientToServerEvents[TEvent]
>;

/**
 * Vérifie les données envoyées par le client au serveur.
 */
export function validateSocketEvent<
  TEvent extends keyof ClientToServerEvents,
>(
  event: TEvent,
  payload: unknown,
): z.ZodSafeParseResult<EventPayload<TEvent>> {
  return clientToServerEvents[event].safeParse(payload) as z.ZodSafeParseResult<
    EventPayload<TEvent>
  >;
}
