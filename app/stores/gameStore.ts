import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { Player } from "~~/shared/types/game/player";

export const useGameStore = defineStore("game", () => {
  const gameId = ref<string | null>(null);
  const players = ref<Player[]>([]);
  const currentPlayerId = ref<string | null>(null);
  const hostPlayerId = ref<string | null>(null);

  const currentPlayer = computed(() => {
    return players.value.find(
      (player) => player.id === currentPlayerId.value,
    ) ?? null;
  });

  function setGameId(id: string) {
    gameId.value = id;
  }

  function addPlayer(player: Player) {
    const playerIndex = players.value.findIndex(
      (existingPlayer) => existingPlayer.id === player.id,
    );

    if (playerIndex === -1) {
      players.value.push(player);
      return;
    }

    players.value[playerIndex] = player;
  }

  function setPlayers(newPlayers: Player[]) {
    players.value = newPlayers;
  }

  function removePlayer(playerId: string) {
    players.value = players.value.filter((player) => player.id !== playerId);
  }

  function setCurrentPlayerId(playerId: string) {
    currentPlayerId.value = playerId;
  }

  function setHostPlayerId(playerId: string) {
    hostPlayerId.value = playerId;
  }

  const isHost = computed(() => {
    return currentPlayerId.value === hostPlayerId.value;
  });

  return {
    gameId,
    players,
    currentPlayerId,
    currentPlayer,
    setGameId,
    addPlayer,
    setPlayers,
    removePlayer,
    setCurrentPlayerId,
    hostPlayerId,
    setHostPlayerId,
    isHost,
  };
});
