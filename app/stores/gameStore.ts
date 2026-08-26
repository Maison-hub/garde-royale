import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { Player } from "~~/shared/types/game/player";

export const useGameStore = defineStore("game", () => {
  const gameId = ref<string | null>(null);
  const players = ref<Player[]>([]);
  const currentPlayerId = ref<string | null>(null);

  const currentPlayer = computed(() => {
    return players.value.find(
      (player) => player.id === currentPlayerId.value,
    ) ?? null;
  });

  function setGameId(id: string) {
    gameId.value = id;
  }

  function addPlayer(player: Player) {
    players.value.push(player);
  }

  function removePlayer(playerId: string) {
    players.value = players.value.filter((player) => player.id !== playerId);
  }

  function setCurrentPlayerId(playerId: string) {
    currentPlayerId.value = playerId;
  }

  return {
    gameId,
    players,
    currentPlayerId,
    currentPlayer,
    setGameId,
    addPlayer,
    removePlayer,
    setCurrentPlayerId,
  };
});
