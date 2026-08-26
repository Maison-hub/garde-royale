import type { ServerToClientSocketEvents } from "~~/shared/socket/events";

type ServerEventName = keyof ServerToClientSocketEvents & string;
/**
 * Permet d'écouter un événement Socket.IO côté client.
 * Usage:
 * ```ts
 * useSocketOn(GameEvents.gameCreated, (payload) => {
 *   console.log("Game created:", payload.gameId);
 * });
 * ```
 * @param event Le nom de l'événement à écouter.
 * @param handler La fonction à exécuter lorsque l'événement est reçu.
 */
export function useSocketOn<TEvent extends ServerEventName>(
  event: TEvent,
  handler: ServerToClientSocketEvents[TEvent],
) {
  const { $socket: socket } = useNuxtApp();

  onMounted(() => {
    // Socket.IO ne sait pas associer un événement générique à son handler.
    socket.on(event, handler as never);
  });

  onBeforeUnmount(() => {
    socket.off(event, handler as never);
  });
}
