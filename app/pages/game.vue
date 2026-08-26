<script setup lang="ts">
import { useGameStore } from "~/stores/gameStore";

const route = useRoute();
const gameStore = useGameStore();

const gameId = computed(() => {
  return typeof route.query.id === "string"
    ? route.query.id
    : gameStore.gameId;
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
      <h2>Partie en cours</h2>
      <p>Le jeu va apparaître ici.</p>
    </section>
  </main>
</template>
