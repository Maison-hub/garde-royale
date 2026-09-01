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
const router = useRouter();
const gameStore = useGameStore();
const socket = useSocket();
const socketIdWhenPageOpened = import.meta.client ? socket.id : undefined;

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
const faceUpHandCardIndexes = ref<number[]>([]);
const pendingHand = ref<CardId[] | null>(null);
const deckElement = ref<HTMLElement | null>(null);
const handElement = ref<HTMLElement | null>(null);
const dealingCardElement = ref<HTMLElement | null>(null);
const dealingCardPosition = ref({ x: 0, y: 0 });
const dealingPlayerId = ref<string | null>(null);
const dealtPlayerId = ref<string | null>(null);
const isDealingCard = ref(false);
const opponentSeats = new Map<string, HTMLElement>();
let dealingAnimation: Animation | null = null;
let dealtPlayerTimeout: number | undefined;

const isWaitingForOwnCard = computed(() => {
  return isDealingCard.value && dealingPlayerId.value === gameStore.currentPlayerId;
});

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

function kickPlayer(playerId: string) {
  if (!gameStore.gameId) {
    return;
  }

  errorMessage.value = "";
  socket.emit(GameClientEvent.kickPlayer, {
    gameId: gameStore.gameId,
    targetPlayerId: playerId,
  }, (response) => {
    if (!response.success) {
      errorMessage.value = response.error;
    }
  });
}

function goBackThroughLobby() {
  const routeGameId = typeof route.query.id === "string" ? route.query.id : null;

  if (!routeGameId) {
    gameStore.clearGame();
    router.replace({ path: "/", query: { error: "Le code de partie est manquant" } });
    return;
  }

  router.replace({ path: "/lobby", query: { id: routeGameId } });
}

function handleSocketReconnect() {
  if (!socketIdWhenPageOpened || socket.id !== socketIdWhenPageOpened) {
    goBackThroughLobby();
  }
}

function getPlayerPseudo(playerId: string) {
  return gameStore.players.find((player) => player.id === playerId)?.pseudo ?? "Joueur inconnu";
}

function getPlayerState(playerId: string) {
  return gameStore.gameState?.roundPlayerStates.find(
    (state) => state.playerId === playerId,
  );
}

function getPlayerPlayedCards(playerId: string) {
  return gameStore.playedCards.filter((card) => card.playerId === playerId);
}

function isHandCardFaceUp(cardIndex: number) {
  return faceUpHandCardIndexes.value.includes(cardIndex);
}

function setHandCardFaceUp(cardIndex: number, isFaceUp: boolean) {
  faceUpHandCardIndexes.value = isFaceUp
    ? [...new Set([...faceUpHandCardIndexes.value, cardIndex])]
    : faceUpHandCardIndexes.value.filter((index) => index !== cardIndex);
}

function setOpponentSeat(playerId: string, element: unknown) {
  if (element instanceof HTMLElement) {
    opponentSeats.set(playerId, element);
    return;
  }

  opponentSeats.delete(playerId);
}

function markCardAsDealt(playerId: string) {
  dealtPlayerId.value = playerId;

  if (dealtPlayerTimeout) {
    window.clearTimeout(dealtPlayerTimeout);
  }

  dealtPlayerTimeout = window.setTimeout(() => {
    dealtPlayerId.value = null;
  }, 450);
}

async function dealCardToPlayer(playerId: string) {
  if (!import.meta.client) {
    return;
  }

  const destination = playerId === gameStore.currentPlayerId
    ? handElement.value
    : opponentSeats.get(playerId);

  if (!deckElement.value || !destination) {
    markCardAsDealt(playerId);
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    markCardAsDealt(playerId);
    return;
  }

  dealingAnimation?.cancel();
  const deckBounds = deckElement.value.getBoundingClientRect();
  const destinationBounds = destination.getBoundingClientRect();
  const offsetX = destinationBounds.left + (destinationBounds.width / 2) - deckBounds.left - (deckBounds.width / 2);
  const offsetY = destinationBounds.top + (destinationBounds.height / 2) - deckBounds.top - (deckBounds.height / 2);

  dealingCardPosition.value = {
    x: deckBounds.left + (deckBounds.width / 2),
    y: deckBounds.top + (deckBounds.height / 2),
  };
  dealingPlayerId.value = playerId;
  isDealingCard.value = true;

  await nextTick();

  const card = dealingCardElement.value;

  if (!card) {
    isDealingCard.value = false;
    dealingPlayerId.value = null;
    markCardAsDealt(playerId);
    return;
  }

  const rotation = offsetX < 0 ? -8 : 8;
  const animation = card.animate([
    {
      opacity: 0.2,
      transform: "translate(-50%, -50%) scale(0.65) rotate(0deg)",
    },
    {
      opacity: 1,
      transform: `translate(calc(-50% + ${offsetX * 0.82}px), calc(-50% + ${offsetY * 0.82}px)) scale(1.04) rotate(${rotation}deg)`,
      offset: 0.78,
    },
    {
      opacity: 0,
      transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(0.86) rotate(${rotation}deg)`,
    },
  ], {
    duration: 700,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    fill: "forwards",
  });

  dealingAnimation = animation;

  try {
    await animation.finished;
  } catch {
    return;
  } finally {
    if (dealingAnimation === animation) {
      dealingAnimation = null;
      isDealingCard.value = false;
      dealingPlayerId.value = null;
    }
  }

  markCardAsDealt(playerId);
}

useSocketOn(GameServerEvent.handUpdated, (payload) => {
  if (gameStore.hand.length === 1 && payload.cards.length === 2) {
    pendingHand.value = [...payload.cards];
    return;
  }

  pendingHand.value = null;
  gameStore.setHand(payload.cards);
  faceUpHandCardIndexes.value = [];
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

    const playerId = payload.game.currentPlayerId;
    const nextHand = playerId === gameStore.currentPlayerId
      ? pendingHand.value
      : null;

    pendingHand.value = null;

    if (!playerId) {
      return;
    }

    void dealCardToPlayer(playerId).finally(() => {
      if (nextHand) {
        gameStore.setHand(nextHand);
        faceUpHandCardIndexes.value = [];
      }
    });
  }
});

useSocketOn(GameServerEvent.playerUpdated, (payload) => {
  if (payload.gameId === gameStore.gameId) {
    gameStore.addPlayer(payload.player);
  }
});

useSocketOn(GameServerEvent.playerLeft, (payload) => {
  if (payload.gameId === gameStore.gameId) {
    gameStore.removePlayer(payload.playerId);
  }
});

useSocketOn(GameServerEvent.kicked, (payload) => {
  if (payload.gameId !== gameStore.gameId) {
    return;
  }

  gameStore.clearGame();
  router.replace({
    path: "/",
    query: { error: "Vous avez été exclu de la partie" },
  });
});

onMounted(() => {
  const routeGameId = typeof route.query.id === "string" ? route.query.id : null;
  const hasCorrectGame = routeGameId
    && gameStore.gameState?.id === routeGameId
    && gameStore.currentPlayerId;

  if (!hasCorrectGame) {
    goBackThroughLobby();
    return;
  }

  socket.on("connect", handleSocketReconnect);
});

onBeforeUnmount(() => {
  socket.off("connect", handleSocketReconnect);
  dealingAnimation?.cancel();

  if (dealtPlayerTimeout) {
    window.clearTimeout(dealtPlayerTimeout);
  }
});
</script>

<template>
  <main class="h-dvh overflow-hidden px-4 py-5">
    <div class="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col gap-3">
      <header class="flex shrink-0 items-start justify-between gap-4">
        <div>
          <p class="mb-1 text-xs font-bold uppercase tracking-widest text-brand">Partie #{{ gameId }}</p>
          <h1 class="mb-0 font-royale text-4xl">Garde Royale</h1>
        </div>
        <p v-if="gameStore.currentPlayer" class="m-0 pt-2 text-right text-sm text-text-muted">
          {{ gameStore.currentPlayer.pseudo }}
        </p>
      </header>

      <p v-if="errorMessage" class="m-0 shrink-0 rounded-lg border border-error px-4 py-3 text-sm text-error">{{ errorMessage }}</p>

      <p v-if="roundWinnerNames" class="m-0 shrink-0 text-center text-sm font-bold text-brand">
        Manche terminée : {{ roundWinnerNames }} gagne<span v-if="gameStore.gameState?.roundWinnerIds.length !== 1">nt</span>.
      </p>
      <p v-else-if="gameStore.gameState?.currentPlayerId" class="m-0 shrink-0 text-center text-sm text-text-muted">
        <span v-if="isCurrentTurn" class="font-bold text-brand">À vous de jouer.</span>
        <span v-else>C'est au tour de {{ getPlayerPseudo(gameStore.gameState.currentPlayerId) }}.</span>
      </p>

      <p v-if="privateResult" class="m-0 shrink-0 text-center text-sm text-text-muted">
        {{ getPlayerPseudo(privateResult.targetPlayerId) }} possède {{ cards[privateResult.card].name }}.
        <button class="min-h-0 px-2 py-1 text-xs" @click="privateResult = null">Masquer</button>
      </p>

      <section class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div class="grid shrink-0 grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-5">
          <div
            v-for="player in gameStore.players.filter((item) => item.id !== gameStore.currentPlayerId)"
            :key="player.id"
            :ref="(element) => setOpponentSeat(player.id, element)"
            :class="[
              'flex min-w-0 flex-col items-center gap-1 text-center transition-transform duration-300',
              player.id === dealtPlayerId && 'scale-105',
            ]"
          >
            <Card compact :card-id="'garde'" :is-face-up="false" class="pointer-events-none shadow-sm" />
            <div class="min-w-0">
              <p class="m-0 truncate text-sm font-bold text-text-heading">{{ player.pseudo }}</p>
              <p v-if="getPlayerState(player.id)?.eliminated" class="m-0 text-xs text-error">Éliminé</p>
              <p v-else-if="!player.connected" class="m-0 text-xs text-text-muted">Déconnecté</p>
              <p v-else-if="getPlayerState(player.id)?.protected" class="m-0 text-xs text-success">Protégé</p>
            </div>
            <div v-if="getPlayerPlayedCards(player.id).length" class="flex w-full max-w-full gap-1 overflow-x-auto px-1 pb-1">
              <Card
                v-for="(playedCard, index) in getPlayerPlayedCards(player.id)"
                :key="`${playedCard.playerId}-${playedCard.card}-${index}`"
                compact
                :card-id="playedCard.card"
                :is-face-up="true"
                class="pointer-events-none shrink-0 shadow-sm"
              />
            </div>
            <button
              v-if="gameStore.isHost && gameStore.gameState?.roundWinnerIds.length === 0"
              class="min-h-0 px-2 py-1 text-xs primary"
              @click="kickPlayer(player.id)"
            >
              Exclure
            </button>
          </div>
        </div>

        <div class="my-3 shrink-0 border-y border-brand-subtle py-3 text-center">
          <h2 class="mb-1 text-base">Pioche</h2>
          <div ref="deckElement" class="mx-auto mt-2 flex w-fit flex-col items-center gap-1">
            <Card compact :card-id="'garde'" :is-face-up="false" class="pointer-events-none shadow-sm" />
            <p class="m-0 text-xs text-text-muted">Les cartes partent d’ici.</p>
          </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-hidden">
          <p class="m-0 shrink-0 text-sm font-bold text-text-heading">Votre main</p>
          <div v-if="getPlayerPlayedCards(gameStore.currentPlayerId ?? '').length" class="flex w-full shrink-0 gap-1 overflow-x-auto px-1 pb-1">
            <Card
              v-for="(playedCard, index) in getPlayerPlayedCards(gameStore.currentPlayerId ?? '')"
              :key="`${playedCard.playerId}-${playedCard.card}-${index}`"
              compact
              :card-id="playedCard.card"
              :is-face-up="true"
              class="pointer-events-none shrink-0 shadow-sm"
            />
          </div>
          <p v-if="gameStore.hand.length === 0" class="m-0 text-sm text-text-muted">En attente de votre carte…</p>
          <div v-else ref="handElement" class="min-h-0 w-full flex-1 overflow-y-auto">
            <TransitionGroup
              tag="div"
              class="flex min-h-full w-full flex-wrap items-start justify-center gap-2 pb-2"
              enter-active-class="transition duration-300 ease-out"
              enter-from-class="translate-y-4 scale-90 opacity-0"
              enter-to-class="translate-y-0 scale-100 opacity-100"
            >
              <div
                v-for="(card, cardIndex) in gameStore.hand"
                :key="`${card}-${cardIndex}`"
                class="flex shrink-0 flex-col items-center gap-2 text-center"
              >
                <Card
                  :card-id="card"
                  :is-face-up="isHandCardFaceUp(cardIndex)"
                  class="w-20 shadow-md sm:w-28"
                  @update:is-face-up="setHandCardFaceUp(cardIndex, $event)"
                />
                <template v-if="isHandCardFaceUp(cardIndex)">
                  <!-- <p class="m-0 text-sm font-bold text-text-heading">{{ cards[card].name }}</p>
                  <p class="m-0 text-xs text-text-muted">{{ cards[card].description }}</p> -->
                  <button v-if="isCurrentTurn && !isWaitingForOwnCard" class="primary min-h-0 px-3 py-2 text-xs" @click="askToPlayCard(cardIndex)">
                    Jouer
                  </button>
                </template>
              </div>
            </TransitionGroup>
          </div>
        </div>
      </section>

    </div>
  </main>

  <Teleport to="body">
    <div
      v-if="pendingPrompt && selectedCardIndex !== null"
      class="fixed inset-0 z-40 flex items-end p-4 justify-center sm:items-center sm:justify-center"
      @click.self="cancelCard"
    >
      <section
        class="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-brand-subtle bg-bg-base p-5 shadow-xl bg-elevated"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-effect-title"
      >
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="card-effect-title" class="mb-1 text-lg">Effet de la carte</h2>
            <p class="m-0 text-sm text-text-muted">{{ pendingPrompt.message }}</p>
          </div>
          <button class="min-h-0 shrink-0 px-2 py-1 text-xs primary" aria-label="Annuler" @click="cancelCard">Fermer</button>
        </div>

        <div class="flex flex-col gap-3">
          <label v-if="pendingPrompt.kind === 'target' || pendingPrompt.kind === 'guard'" class="flex flex-col items-stretch gap-2">
            Joueur
            <select v-model="selectedTargetId" class="w-full bg-sunken p-2 rounded-md">
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

          <label v-if="pendingPrompt.kind === 'guard'" class="flex flex-col items-stretch gap-2">
            Carte
            <select v-model="selectedGuess" class="w-full bg-sunken p-2 rounded-md">
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

          <div class="mt-2 flex gap-3">
            <button class="primary flex-1" :disabled="!canConfirmCard" @click="confirmCard">Confirmer</button>
            <button class="flex-1" @click="cancelCard">Annuler</button>
          </div>
        </div>
      </section>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="isDealingCard"
      ref="dealingCardElement"
      class="pointer-events-none fixed z-50"
      :style="{ left: dealingCardPosition.x + 'px', top: dealingCardPosition.y + 'px' }"
    >
      <Card compact :card-id="'garde'" :is-face-up="false" class="shadow-xl" />
    </div>
  </Teleport>
</template>
