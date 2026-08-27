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
let joinedSocketId: string | undefined;

if (routeGameId) {
    gameStore.setGameId(routeGameId);
}

function redirectToHome(error: string) {
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
        joinedSocketId = socket.id;
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

    socket.emit(GameClientEvent.exists, { gameId: routeGameId }, (response) => {
        if (!response.exists) {
            redirectToHome("La partie n'existe pas");
            return;
        }

        const storedPseudo = getStoredPlayerPseudo();

        if (!storedPseudo) {
            askForPseudo.value = true;
            return;
        }

        pseudo.value = storedPseudo;
        joinGame();
    });
}

function startGame(){
    if (!gameStore.gameId || !gameStore.currentPlayerId) {
        return;
    }

    socket.emit(GameClientEvent.start, { gameId: gameStore.gameId }, (response) => {
        if (!response.success) {
            console.error(response.error);
            return;
        }

        router.push({ path: '/game', query: { id: gameStore.gameId } });
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
    console.log('Player joined:', payload.player);
    gameStore.addPlayer(payload.player);
});

useSocketOn(GameServerEvent.playerLeft, (payload) => {
    if (payload.gameId !== gameStore.gameId) {
        return;
    }

    console.log('Player left:', payload.playerId);
    gameStore.removePlayer(payload.playerId);
});

</script>


<template>
    <div v-if="askForPseudo">
        <h1>Rejoindre la partie #{{ routeGameId }}</h1>
        <input v-model="pseudo" placeholder="Votre pseudo" @keyup.enter="joinGame" />
        <button @click="joinGame">Rejoindre</button>
    </div>
    <template v-else>
        <div>
            <h1>Id: #{{ gameStore.gameId }}</h1>
        </div>
        <div>
            <h2>Participants</h2>
            <ul>
                <li v-for="player in gameStore.players" :key="player.id">
                    {{ player.pseudo }} <span v-if="player.id == gameStore.currentPlayerId">( you )</span>
                    <span v-if="player.id == gameStore.hostPlayerId">👑</span>
                </li>
            </ul>
        </div>
    </template>
    <div v-if="gameStore.currentPlayerId === gameStore.hostPlayerId">
        <button @click="startGame">Démarrer la partie</button>
    </div>
</template>
