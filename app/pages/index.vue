<script setup lang="ts">
import { GameClientEvent } from '~~/shared/socket/events/game-events';
import { useGameStore } from '~/stores/gameStore';
import { getOrCreatePlayerId, savePlayerPseudo } from '~/utils/playerIdentity';

const gameStore = useGameStore();
const socket = useSocket();
const route = useRoute();
const router = useRouter();
const pseudo = ref('');
const gameId = ref('');
const errorMessage = computed(() => {
    return typeof route.query.error === 'string' ? route.query.error : null;
});

const createGame = () => {
    const playerPseudo = pseudo.value.trim();

    if (!playerPseudo) {
        alert('Veuillez entrer un pseudo');
        return;
    }

    const playerId = getOrCreatePlayerId();

    socket.emit(GameClientEvent.create, {
        playerId,
        pseudo: playerPseudo,
    }, (response) => {
        if (!response.success) {
            console.error(response.error);
            return;
        }

        savePlayerPseudo(playerPseudo);
        gameId.value = response.gameId;
        gameStore.setGameId(response.gameId);
        gameStore.addPlayer(response.player);
        gameStore.setCurrentPlayerId(response.player.id);
        router.push({ path: '/lobby', query: { id: response.gameId } });
    });
}

const joinGame = () => {
    const playerPseudo = pseudo.value.trim();
    const requestedGameId = gameId.value.trim().toUpperCase();

    if (!playerPseudo) {
        alert('Veuillez entrer un pseudo');
        return;
    }

    if (!requestedGameId) {
        alert('Veuillez entrer un ID de partie');
        return;
    }

    getOrCreatePlayerId();
    savePlayerPseudo(playerPseudo);
    router.push({ path: '/lobby', query: { id: requestedGameId } });
}

</script>

<template>

    <div>
        <h1>Garde Royale</h1>
        <p v-if="errorMessage">{{ errorMessage }}</p>
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
