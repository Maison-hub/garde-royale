import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { GameState } from "~~/shared/types/game/game";
import type { Player } from "~~/shared/types/game/player";

export const useGameStore = defineStore("game", () => {
  const gameId = ref<string | null>(null);
  const players = ref<Player[]>([]);
  const currentPlayerId = ref<string | null>(null);
  const hostPlayerId = ref<string | null>(null);
  const gameState = ref<GameState | null>(null);

  const currentPlayer = computed(() => {
    return players.value.find(
      (player) => player.id === currentPlayerId.value,
    ) ?? null;
  });

  function setGameId(id: string) {
    gameId.value = id;
  }

  function setGameState(newGameState: GameState) {
    gameState.value = newGameState;
    gameId.value = newGameState.id;
    players.value = newGameState.players;
    hostPlayerId.value = newGameState.hostPlayerId;
  }

  function addPlayer(player: Player) {
    const playerIndex = players.value.findIndex(
      (existingPlayer) => existingPlayer.id === player.id,
    );

    if (playerIndex === -1) {
      players.value.push(player);
    } else {
      players.value[playerIndex] = player;
    }

    if (gameState.value) {
      gameState.value = { ...gameState.value, players: players.value };
    }
  }

  function setPlayers(newPlayers: Player[]) {
    players.value = newPlayers;

    if (gameState.value) {
      gameState.value = { ...gameState.value, players: newPlayers };
    }
  }

  function removePlayer(playerId: string) {
    players.value = players.value.filter((player) => player.id !== playerId);

    if (gameState.value) {
      gameState.value = { ...gameState.value, players: players.value };
    }
  }

  function setCurrentPlayerId(playerId: string) {
    currentPlayerId.value = playerId;
  }

  function setHostPlayerId(playerId: string) {
    hostPlayerId.value = playerId;

    if (gameState.value) {
      gameState.value = { ...gameState.value, hostPlayerId: playerId };
    }
  }

  const isHost = computed(() => {
    return currentPlayerId.value === hostPlayerId.value;
  });

  return {
    gameId,
    gameState,
    players,
    currentPlayerId,
    currentPlayer,
    setGameId,
    setGameState,
    addPlayer,
    setPlayers,
    removePlayer,
    setCurrentPlayerId,
    hostPlayerId,
    setHostPlayerId,
    isHost,
  };
});
