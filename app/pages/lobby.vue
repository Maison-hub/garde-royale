<script setup lang="ts">
import { GameClientEvent, GameServerEvent } from '~~/shared/socket/events/game-events';
import {useGameStore} from '~/stores/gameStore';

const route = useRoute()
const router = useRouter();
const gameStore = useGameStore();
const socket = useSocket();
const routeGameId = typeof route.query.id === 'string' ? route.query.id : null;

if (routeGameId) {
    gameStore.setGameId(routeGameId);
}

onMounted(() => {
    if (!routeGameId) {
        router.replace({ path: '/', query: { error: "La partie n'existe pas" } });
        return;
    }

    socket.emit(GameClientEvent.exists, { gameId: routeGameId }, (response) => {
        if (!response.exists) {
            router.replace({ path: '/', query: { error: "La partie n'existe pas" } });
        }
    });
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
    <div>
        <h1>Id: #{{ gameStore.gameId }}</h1>
    </div>
    <div>
        <h2>Participants</h2>
        <ul>
            <li v-for="player in gameStore.players" :key="player.id">
                {{ player.pseudo }} <span v-if="player.id == gameStore.currentPlayerId">( you )</span>
            </li>
        </ul>

    </div>
</template>
