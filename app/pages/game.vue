<script setup lang="ts">
import { GameClientEvent, GameServerEvent } from "~~/shared/socket/events/game-events";
import { useGameStore } from "~/stores/gameStore";

const route = useRoute();
const gameStore = useGameStore();
const socket = useSocket();

const gameId = computed(() => {
  return typeof route.query.id === "string"
    ? route.query.id
    : gameStore.gameId;
});

const isCurrentTurn = computed(() => {
  return gameStore.gameState?.currentPlayerId === gameStore.currentPlayerId;
});

function playCard(cardIndex: number) {
  if (!gameStore.gameId) {
    return;
  }

  socket.emit(GameClientEvent.playCard, { gameId: gameStore.gameId, cardIndex }, (response) => {
    if (!response.success) {
      console.error(response.error);
    }
  });
}

useSocketOn(GameServerEvent.handUpdated, (payload) => {
  console.log("Received hand update:", payload);
  gameStore.setHand(payload.cards);
});

useSocketOn(GameServerEvent.turnStarted, (payload) => {
  if (payload.game.id === gameStore.gameId) {
    gameStore.setGameState(payload.game);
  }
});
</script>

<template>
  <main>
    <h1>Garde Royale</h1>
    <p>Partie #{{ gameId }}</p>

    <p v-if="gameStore.currentPlayer">
      Vous êtes {{ gameStore.currentPlayer.pseudo }}
    </p>

    <section>
      <h2>Joueurs</h2>
      <ul>
        <li v-for="player in gameStore.players" :key="player.id">
          {{ player.pseudo }}
          <span v-if="player.id === gameStore.currentPlayerId">(vous)</span>
          <span v-if="player.id === gameStore.hostPlayerId">(hôte)</span>
        </li>
      </ul>
    </section>

    <section>
      <h2>Cartes en main</h2>
      <ul>
        <li v-for="(card, cardIndex) in gameStore.hand" :key="`${card}-${cardIndex}`">
          {{ card }}
          <button v-if="isCurrentTurn" @click="playCard(cardIndex)">Jouer</button>
        </li>
      </ul>
    </section>

    <section>
      <h2>Partie en cours</h2>
      <p>Le jeu va apparaître ici.</p>
    </section>
  </main>
</template>
