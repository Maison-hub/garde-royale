import type { Server, Socket } from "socket.io";
import { ClientToServerSocketEvents, ServerToClientSocketEvents } from "~~/shared/socket/events";

export function registerTurnHandlers(
      io: Server<ClientToServerSocketEvents, ServerToClientSocketEvents>,
      socket: Socket<ClientToServerSocketEvents, ServerToClientSocketEvents>,
){
    
}
