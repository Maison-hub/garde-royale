<script setup lang="ts">
import { GameServerEvent } from '~~/shared/socket/events/game-events';
import {useGameStore} from '~/stores/gameStore';

const route = useRoute()
const gameStore = useGameStore();

if (route.query.id) {
    gameStore.setGameId(route.query.id as string);
}
console.log('Lobby mounted with gameId:', gameStore.gameId);

useSocketOn(GameServerEvent.playerJoined, (payload) => {
    console.log('Player joined:', payload.player);
    gameStore.addPlayer(payload.player);
});

</script>


<template>
    <div>
        <h1>Partie #{{ gameStore.gameId }}</h1>
    </div>
    <div>
        <h2>Joueurs</h2>
        <ul>
            <li v-for="player in gameStore.players" :key="player.id">
                {{ player.pseudo }} <span v-if="player.id == gameStore.currentPlayerId">you</span>
            </li>
        </ul>

    </div>
</template>
