const PLAYER_ID_KEY = "garde-royale:player-id";
const PLAYER_PSEUDO_KEY = "garde-royale:player-pseudo";

export function getOrCreatePlayerId(): string {
  const storedPlayerId = localStorage.getItem(PLAYER_ID_KEY);

  if (storedPlayerId) {
    return storedPlayerId;
  }

  const playerId = crypto.randomUUID();
  localStorage.setItem(PLAYER_ID_KEY, playerId);

  return playerId;
}

export function getStoredPlayerPseudo(): string | null {
  return localStorage.getItem(PLAYER_PSEUDO_KEY);
}

export function savePlayerPseudo(pseudo: string): void {
  localStorage.setItem(PLAYER_PSEUDO_KEY, pseudo);
}
