import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerSocketEvents,
  ServerToClientSocketEvents,
} from "~~/shared/socket/events";

export default defineNuxtPlugin(() => {
  const socket: Socket<
    ServerToClientSocketEvents,
    ClientToServerSocketEvents
  > = io();

  return {
    provide: { socket },
  };
});