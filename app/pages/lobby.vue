<script setup lang="ts">
import { GameClientEvent, GameServerEvent } from '~~/shared/socket/events/game-events';
import {useGameStore} from '~/stores/gameStore';
import {
    getOrCreatePlayerId,
    getStoredPlayerPseudo,
    savePlayerPseudo,
} from '~/utils/playerIdentity';

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();
const socket = useSocket();
const routeGameId = typeof route.query.id === 'string' ? route.query.id : null;
const pseudo = ref('');
const askForPseudo = ref(false);
const isCheckingGame = ref(true);
const errorMessage = ref('');
let joinedSocketId: string | undefined;

const canStartGame = computed(() => {
    return gameStore.players.every((player) => player.connected);
});

if (routeGameId) {
    gameStore.setGameId(routeGameId);
}

function redirectToHome(error: string) {
    gameStore.clearGame();
    router.replace({ path: '/', query: { error } });
}

function joinGame() {
    if (!routeGameId) {
        redirectToHome("La partie n'existe pas");
        return;
    }

    const playerPseudo = pseudo.value.trim();

    if (!playerPseudo) {
        askForPseudo.value = true;
        return;
    }

    const playerId = getOrCreatePlayerId();

    socket.emit(GameClientEvent.join, {
        gameId: routeGameId,
        playerId,
        pseudo: playerPseudo,
    }, (response) => {
        if (!response.success) {
            redirectToHome(response.error);
            return;
        }

        savePlayerPseudo(playerPseudo);
        gameStore.setGameState(response.game);
        gameStore.setCurrentPlayerId(response.player.id);
        askForPseudo.value = false;
        isCheckingGame.value = false;
        joinedSocketId = socket.id;

        if (response.game.status !== 'lobby') {
            router.replace({ path: '/game', query: { id: response.game.id } });
        }
    });
}

function checkGameAndJoin() {
    if (!routeGameId) {
        redirectToHome("La partie n'existe pas");
        return;
    }

    if (!socket.connected || joinedSocketId === socket.id) {
        return;
    }

    isCheckingGame.value = true;
    socket.emit(GameClientEvent.syncLobby, { gameId: routeGameId }, (response) => {
        if (!response.success) {
            redirectToHome(response.error);
            return;
        }

        gameStore.setGameState(response.game);

        const storedPseudo = getStoredPlayerPseudo();

        if (!storedPseudo) {
            askForPseudo.value = true;
            isCheckingGame.value = false;
            return;
        }

        pseudo.value = storedPseudo;
        joinGame();
    });
}

function kickPlayer(playerId: string) {
    if (!gameStore.gameId) {
        return;
    }

    errorMessage.value = '';
    socket.emit(GameClientEvent.kickPlayer, {
        gameId: gameStore.gameId,
        targetPlayerId: playerId,
    }, (response) => {
        if (!response.success) {
            errorMessage.value = response.error;
        }
    });
}

function startGame(){
    const activeGameId = gameStore.gameId;

    if (!activeGameId || !gameStore.currentPlayerId) {
        return;
    }

    errorMessage.value = '';
    socket.emit(GameClientEvent.start, { gameId: activeGameId }, (response) => {
        if (!response.success) {
            errorMessage.value = response.error ?? "Impossible de démarrer la partie";
            return;
        }

        router.push({ path: '/game', query: { id: activeGameId } });
    });
}

useSocketOn(GameServerEvent.handUpdated, (payload) => {
    gameStore.setHand(payload.cards);
});

useSocketOn(GameServerEvent.started, (payload) => {
    if (payload.game.id !== gameStore.gameId) {
        return;
    }

    gameStore.setGameState(payload.game);
    router.push({ path: '/game', query: { id: gameStore.gameId } });
});

onMounted(() => {
    socket.on('connect', checkGameAndJoin);
    checkGameAndJoin();
});

onBeforeUnmount(() => {
    socket.off('connect', checkGameAndJoin);
});

useSocketOn(GameServerEvent.playerJoined, (payload) => {
    gameStore.addPlayer(payload.player);
});

useSocketOn(GameServerEvent.playerUpdated, (payload) => {
    if (payload.gameId === gameStore.gameId) {
        gameStore.addPlayer(payload.player);
    }
});

useSocketOn(GameServerEvent.playerLeft, (payload) => {
    if (payload.gameId !== gameStore.gameId) {
        return;
    }

    gameStore.removePlayer(payload.playerId);
});

useSocketOn(GameServerEvent.kicked, (payload) => {
    if (payload.gameId === gameStore.gameId) {
        redirectToHome('Vous avez été exclu de la partie');
    }
});

</script>


<template>
    <main class="min-h-screen px-4 py-8">
        <div class="mx-auto flex w-full max-w-md flex-col gap-6">
            <header class="text-center">
                <p class="mb-2 text-sm font-bold uppercase tracking-widest text-brand">Salon de jeu</p>
                <h1 class="mb-0 font-royale text-4xl">Garde Royale</h1>
            </header>

            <section v-if="isCheckingGame" class="rounded-2xl  p-6 text-center ">
                <p class="m-0 text-text-muted">Vérification de la partie…</p>
            </section>

            <template v-else>
                <p v-if="errorMessage" class="m-0 rounded-lg border border-error bg-error-light px-4 py-3 text-sm text-text-heading">
                    {{ errorMessage }}
                </p>

                <section v-if="askForPseudo" class="rounded-2xl ">
                    <h2 class="text-xl">Rejoindre la partie</h2>
                    <p class="mb-5 text-sm text-text-muted">Partie #{{ routeGameId }}</p>
                    <div class="flex flex-col gap-3">
                        <input v-model="pseudo" placeholder="Votre pseudo" @keyup.enter="joinGame" />
                        <button class="w-full py-3" @click="joinGame">Rejoindre</button>
                    </div>
                </section>

                <section v-else class="rounded-2xl  p-6 flex flex-col gap-4">
                    <div class="mb-6 flex items-start justify-between gap-4">
                        <div>
                            <h2 class="mb-1 text-xl">
                                Partie 
                                <span class="font-bold">
                                    # {{ gameStore.gameId }}
                                </span>
                            </h2>
                            <p class="m-0 text-sm text-text-muted">En attente des joueurs</p>
                        </div>
                        <span class="rounded-full bg-brand-subtle px-3 py-1 text-xs font-bold text-brand-foreground">
                            {{ gameStore.players.length }} joueur<span v-if="gameStore.players.length !== 1">s</span>
                        </span>
                    </div>

                    <div>
                        <h3 class="mb-3 text-base">Participants</h3>
                        <ul class="m-0 flex list-none flex-col gap-2 p-0">
                            <li
                                v-for="player in gameStore.players"
                                :key="player.id"
                                class="flex items-center justify-between gap-3 rounded-lg  bg-bg-sunken px-4 py-3"
                            >
                                <div class="min-w-0">
                                    <p class="m-0 truncate font-bold text-text-heading">
                                        {{ player.pseudo }}
                                        <span v-if="player.id === gameStore.currentPlayerId" class="font-normal text-text-muted">(vous)</span>
                                        <span v-if="player.id === gameStore.hostPlayerId">👑</span>
                                    </p>
                                    <p v-if="!player.connected" class="m-0 text-xs text-text-muted">Déconnecté</p>
                                </div>
                                <button
                                    v-if="gameStore.isHost && player.id !== gameStore.currentPlayerId"
                                    class="min-h-0 shrink-0 px-2 py-1 rounded-full font-bold text-xs bg-brand text-white"
                                    @click="kickPlayer(player.id)"
                                >
                                    Exclure
                                </button>
                            </li>
                        </ul>
                    </div>

                    <button
                        v-if="gameStore.isHost && gameStore.gameState?.status === 'lobby'"
                        class="primary "
                        :disabled="!canStartGame"
                        @click="startGame"
                    >
                        Démarrer la partie
                    </button>
                </section>
            </template>
        </div>
    </main>
</template>
