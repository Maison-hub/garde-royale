<script setup lang="ts">
import { GameClientEvent, GameServerEvent } from "~~/shared/socket/events/game-events";
import { cards, type CardId } from "~~/shared/game/cards";
import type {
  CardAction,
  CardPrompt,
  PrivateEffectResult,
} from "~~/shared/types/game/card-action";
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

const selectedCardIndex = ref<number | null>(null);
const pendingPrompt = ref<CardPrompt | null>(null);
const selectedTargetId = ref("");
const selectedGuess = ref<CardId | "">("");
const errorMessage = ref("");
const privateResult = ref<PrivateEffectResult | null>(null);

const roundWinnerNames = computed(() => {
  return (gameStore.gameState?.roundWinnerIds ?? [])
    .map(getPlayerPseudo)
    .join(" et ");
});

const canConfirmCard = computed(() => {
  if (!pendingPrompt.value || pendingPrompt.value.kind === "none") {
    return true;
  }

  if (!selectedTargetId.value) {
    return false;
  }

  return pendingPrompt.value.kind !== "guard" || Boolean(selectedGuess.value);
});

function askToPlayCard(cardIndex: number) {
  if (!gameStore.gameId) {
    return;
  }

  errorMessage.value = "";
  privateResult.value = null;

  socket.emit(GameClientEvent.getCardOptions, {
    gameId: gameStore.gameId,
    cardIndex,
  }, (response) => {
    if (!response.success) {
      errorMessage.value = response.error;
      return;
    }

    selectedCardIndex.value = cardIndex;
    pendingPrompt.value = response.prompt;
    selectedTargetId.value = "";
    selectedGuess.value = "";
  });
}

function confirmCard() {
  if (!gameStore.gameId || selectedCardIndex.value === null || !pendingPrompt.value) {
    return;
  }

  const action: CardAction = {};

  if (pendingPrompt.value.kind === "target" || pendingPrompt.value.kind === "guard") {
    action.targetPlayerId = selectedTargetId.value || undefined;
  }

  if (pendingPrompt.value.kind === "guard") {
    action.guessedCard = selectedGuess.value || undefined;
  }

  socket.emit(GameClientEvent.playCard, {
    gameId: gameStore.gameId,
    cardIndex: selectedCardIndex.value,
    action,
  }, (response) => {
    if (!response.success) {
      errorMessage.value = response.error;
      return;
    }

    privateResult.value = response.privateResult ?? null;
    cancelCard();
  });
}

function cancelCard() {
  selectedCardIndex.value = null;
  pendingPrompt.value = null;
  selectedTargetId.value = "";
  selectedGuess.value = "";
}

function getPlayerPseudo(playerId: string) {
  return gameStore.players.find((player) => player.id === playerId)?.pseudo ?? "Joueur inconnu";
}

function getPlayerState(playerId: string) {
  return gameStore.gameState?.roundPlayerStates.find(
    (state) => state.playerId === playerId,
  );
}

useSocketOn(GameServerEvent.handUpdated, (payload) => {
  gameStore.setHand(payload.cards);
});

useSocketOn(GameServerEvent.cardPlayed, (payload) => {
  if (payload.gameId === gameStore.gameId) {
    gameStore.addPlayedCard(payload.playedCard);
  }
});

useSocketOn(GameServerEvent.turnStarted, (payload) => {
  if (payload.game.id === gameStore.gameId) {
    gameStore.setGameState(payload.game);
    cancelCard();
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

    <p v-if="errorMessage">{{ errorMessage }}</p>

    <p v-if="roundWinnerNames">
      Manche terminée. Gagnant<span v-if="gameStore.gameState?.roundWinnerIds.length !== 1">s</span> :
      {{ roundWinnerNames }}
    </p>

    <p v-else-if="gameStore.gameState?.currentPlayerId">
      C'est au tour de {{ getPlayerPseudo(gameStore.gameState.currentPlayerId) }}.
    </p>

    <p v-if="privateResult">
      {{ getPlayerPseudo(privateResult.targetPlayerId) }} possède la carte
      {{ cards[privateResult.card].name }}.
      <button @click="privateResult = null">Masquer</button>
    </p>

    <section>
      <h2>Joueurs</h2>
      <ul>
        <li v-for="player in gameStore.players" :key="player.id">
          {{ player.pseudo }}
          <span v-if="player.id === gameStore.currentPlayerId">(vous)</span>
          <span v-if="player.id === gameStore.hostPlayerId">(hôte)</span>
          <span v-if="getPlayerState(player.id)?.eliminated">— éliminé</span>
          <span v-else-if="getPlayerState(player.id)?.protected">— protégé</span>
        </li>
      </ul>
    </section>

    <section>
      <h2>Cartes en main</h2>
      <ul>
        <li v-for="(card, cardIndex) in gameStore.hand" :key="`${card}-${cardIndex}`">
          <strong>{{ cards[card].name }}</strong> — {{ cards[card].description }}
          <button v-if="isCurrentTurn" @click="askToPlayCard(cardIndex)">Jouer</button>
        </li>
      </ul>
    </section>

    <section v-if="pendingPrompt && selectedCardIndex !== null">
      <h2>Effet de la carte</h2>
      <p>{{ pendingPrompt.message }}</p>

      <label v-if="pendingPrompt.kind === 'target' || pendingPrompt.kind === 'guard'">
        Joueur :
        <select v-model="selectedTargetId">
          <option value="" disabled>Choisir un joueur</option>
          <option
            v-for="playerId in pendingPrompt.targetPlayerIds"
            :key="playerId"
            :value="playerId"
          >
            {{ getPlayerPseudo(playerId) }}
          </option>
        </select>
      </label>

      <label v-if="pendingPrompt.kind === 'guard'">
        Carte :
        <select v-model="selectedGuess">
          <option value="" disabled>Choisir une carte</option>
          <option
            v-for="card in pendingPrompt.allowedCards"
            :key="card"
            :value="card"
          >
            {{ cards[card].name }}
          </option>
        </select>
      </label>

      <button :disabled="!canConfirmCard" @click="confirmCard">Confirmer</button>
      <button @click="cancelCard">Annuler</button>
    </section>

    <section>
      <h2>Cartes jouées</h2>
      <p v-if="gameStore.playedCards.length === 0">Aucune carte jouée.</p>
      <ul v-else>
        <li v-for="(playedCard, index) in gameStore.playedCards" :key="`${playedCard.playerId}-${playedCard.card}-${index}`">
          {{ getPlayerPseudo(playedCard.playerId) }} a joué
          {{ cards[playedCard.card].name }}
        </li>
      </ul>
    </section>

  </main>
</template>
