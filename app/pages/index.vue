<script setup lang="ts">
import { GameClientEvent, GameServerEvent } from '~~/shared/socket/events/game-events';
import { useGameStore } from '~/stores/gameStore';

const gameStore = useGameStore();
const socket = useSocket();
const router = useRouter();
const pseudo = ref('');
const gameId = ref('');

const createGame = () => {
    if (!pseudo.value) {
        alert('Veuillez entrer un pseudo');
        return;
    }
    console.log('create game with pseudo:', pseudo.value);
    socket.emit(GameClientEvent.create, { pseudo: pseudo.value });
}

useSocketOn(GameServerEvent.created, (payload) => {
    console.log('Game created with ID:', payload.gameId);
    gameId.value = payload.gameId;
    gameStore.setGameId(payload.gameId);
    gameStore.addPlayer(payload.player);
    gameStore.setCurrentPlayerId(payload.player.id);
    // navigate to the /lobby?id=gameId route
    router.push({ path: '/lobby', query: { id: payload.gameId } });
});

const joinGame = () => {
    if (!pseudo.value) {
        alert('Veuillez entrer un pseudo');
        return;
    }
    if (!gameId.value) {
        alert('Veuillez entrer un ID de partie');
        return;
    }
    console.log('join game with pseudo:', pseudo.value);
    socket.emit(GameClientEvent.join, { gameId: gameId.value, pseudo: pseudo.value });
}

useSocketOn(GameServerEvent.joined, (payload) => {
    console.log('Joined game with ID:', payload.gameId);
    gameStore.setGameId(payload.gameId);
    payload.players.forEach(player => {
        gameStore.addPlayer(player);
    });
    const currentPlayer = payload.players.find(player => player.pseudo === pseudo.value);
    if (currentPlayer) {
        gameStore.setCurrentPlayerId(currentPlayer.id);
    }
    // navigate to the /lobby?id=gameId route
    router.push({ path: '/lobby', query: { id: payload.gameId } });
});

</script>

<template>

    <div>
        <h1>Garde Royale</h1>
        <div>
            <h2>
                Choisir un pseudo
            </h2>
            <input v-model="pseudo" placeholder="Pseudo" />
        </div>
        <div>
            <h2>Creer une partie</h2>
            <button @click="createGame">Creer</button>
        </div>

        <div>
            <h2>Rejoindre une partie</h2>
            <input v-model="gameId" placeholder="ID de la partie" />
            <button @click="joinGame">Rejoindre</button>
        </div>
    </div>

</template>