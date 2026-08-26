import type { Card } from "./card";
import type { GameSettings } from "./game-settings";
import type { Player } from "./player";

export interface Game {
  id: string;
  status: "lobby" | "playing" | "finished";
  hostPlayerId: string;
  players: Player[];
  deck: Card[];
  discardedCards: Card[];
  currentPlayerId?: string;
  round: number;
  settings: GameSettings;
}
