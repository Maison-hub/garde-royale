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
    <p v-if="isCheckingGame">Vérification de la partie…</p>
    <p v-else-if="errorMessage">{{ errorMessage }}</p>

    <div v-if="!isCheckingGame && askForPseudo">
        <h1>Rejoindre la partie #{{ routeGameId }}</h1>
        <input v-model="pseudo" placeholder="Votre pseudo" @keyup.enter="joinGame" />
        <button @click="joinGame">Rejoindre</button>
    </div>
    <template v-else-if="!isCheckingGame">
        <div>
            <h1>Id: #{{ gameStore.gameId }}</h1>
        </div>
        <div>
            <h2>Participants</h2>
            <ul>
                <li v-for="player in gameStore.players" :key="player.id">
                    {{ player.pseudo }} <span v-if="player.id == gameStore.currentPlayerId">( you )</span>
                    <span v-if="player.id == gameStore.hostPlayerId">👑</span>
                    <span v-if="!player.connected">— déconnecté</span>
                    <button
                        v-if="gameStore.isHost && player.id !== gameStore.currentPlayerId"
                        @click="kickPlayer(player.id)"
                    >
                        Exclure
                    </button>
                </li>
            </ul>
        </div>
    </template>
    <div v-if="!isCheckingGame && gameStore.isHost && gameStore.gameState?.status === 'lobby'">
        <button :disabled="!canStartGame" @click="startGame">Démarrer la partie</button>
    </div>
</template>
