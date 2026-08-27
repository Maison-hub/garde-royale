import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { CardId } from "~~/shared/game/cards";
import type { GameState } from "~~/shared/types/game/game";
import type { Player } from "~~/shared/types/game/player";
import type { PlayedCard } from "~~/shared/types/game/played-card";

export const useGameStore = defineStore("game", () => {
  const gameId = ref<string | null>(null);
  const players = ref<Player[]>([]);
  const currentPlayerId = ref<string | null>(null);
  const hostPlayerId = ref<string | null>(null);
  const gameState = ref<GameState | null>(null);
  const hand = ref<CardId[]>([]);

  const currentPlayer = computed(() => {
    return players.value.find(
      (player) => player.id === currentPlayerId.value,
    ) ?? null;
  });
  const playedCards = computed(() => gameState.value?.playedCards ?? []);

  function setGameId(id: string) {
    if (gameId.value !== id) {
      gameState.value = null;
      players.value = [];
      hostPlayerId.value = null;
      hand.value = [];
    }

    gameId.value = id;
  }

  function setGameState(newGameState: GameState) {
    if (gameId.value !== newGameState.id) {
      hand.value = [];
    }

    gameState.value = newGameState;
    gameId.value = newGameState.id;
    players.value = newGameState.players;
    hostPlayerId.value = newGameState.hostPlayerId;
  }

  function setHand(cards: CardId[]) {
    hand.value = [...cards];
  }

  function addPlayedCard(playedCard: PlayedCard) {
    if (!gameState.value) {
      return;
    }

    gameState.value = {
      ...gameState.value,
      playedCards: [...gameState.value.playedCards, playedCard],
    };
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

  function clearGame() {
    gameId.value = null;
    players.value = [];
    currentPlayerId.value = null;
    hostPlayerId.value = null;
    gameState.value = null;
    hand.value = [];
  }

  const isHost = computed(() => {
    return currentPlayerId.value === hostPlayerId.value;
  });

  return {
    gameId,
    gameState,
    hand,
    players,
    currentPlayerId,
    currentPlayer,
    playedCards,
    setGameId,
    setGameState,
    setHand,
    addPlayedCard,
    addPlayer,
    setPlayers,
    removePlayer,
    setCurrentPlayerId,
    hostPlayerId,
    setHostPlayerId,
    clearGame,
    isHost,
  };
});
