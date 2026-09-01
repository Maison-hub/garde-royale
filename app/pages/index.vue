<script setup client lang="ts">
import { GameClientEvent } from '~~/shared/socket/events/game-events';
import { useGameStore } from '~/stores/gameStore';
import { getOrCreatePlayerId, savePlayerPseudo } from '~/utils/playerIdentity';
import { cardIdSchema } from '~~/shared/game/cards';

const gameStore = useGameStore();
const socket = useSocket();
const route = useRoute();
const router = useRouter();
const pseudo = ref('');
const gameId = ref('');
const errorMessage = computed(() => {
    return typeof route.query.error === 'string' ? route.query.error : null;
});

const pseudoIsSaved = ref(false);

onMounted(() => {
    const savedPseudo = localStorage.getItem('playerPseudo');
    if (savedPseudo) {
        pseudo.value = savedPseudo;
        pseudoIsSaved.value = true;
    }
});

const savePseudo = () => {
    const playerPseudo = pseudo.value.trim();

    if (!playerPseudo) {
        alert('Veuillez entrer un pseudo');
        return;
    }
    savePlayerPseudo(playerPseudo);
    pseudoIsSaved.value = true;
}

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
        gameId.value = response.game.id;
        gameStore.setGameState(response.game);
        gameStore.setCurrentPlayerId(response.player.id);
        router.push({ path: '/lobby', query: { id: response.game.id } });
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
    pseudoIsSaved.value = true;
    router.push({ path: '/lobby', query: { id: requestedGameId } });
}

const getHandCardStyle = (index: number) => {
    const progress = (index - 1) / 4;
    const verticalOffset = (1 - Math.sin(progress * Math.PI)) * 14;

    return {
        transform: `translateY(${verticalOffset}px) rotate(${-50 + progress * 100}deg)`,
        marginLeft: index === 1 ? '0' : '-6rem',
    };
};

</script>

<template>

    <div class="flex flex-col items-center justify-start h-screen px-4">
        <h1 class="font-royale text-[3rem] py-4 text-center">Garde Royale</h1>
        <p v-if="errorMessage">{{ errorMessage }}</p>
        <div v-if="!pseudoIsSaved" class="mb-4 w-full flex-1 flex flex-col gap-4 items-center justify-center max-w-md">
            <h2 class="text-xl font-bold">
                Choisir un pseudo
            </h2>
            <input v-model="pseudo" class="w-full" placeholder="Pseudo" />
            <button class="primary py-2 w-full" @click="savePseudo">Sauvegarder</button>
        </div>

        <div v-if="pseudoIsSaved" class="mb-4 flex-1 flex flex-col gap-4 items-center justify-center max-w-md">

            <div class="mb-4 w-full flex flex-col gap-4 items-center justify-center max-w-md">
                <h2 class="text-xl font-bold">Creer une partie</h2>
                <button class="primary py-2 w-full" @click="createGame">Creer</button>
            </div>
            <div class="flex flex-row items-center justify-center gap-2 w-full max-w-md">
                <div class="w-full h-px bg-gray-300"></div>
                <span> ou </span>
                <div class="w-full h-px bg-gray-300"></div>
            </div>

            <div class="mb-4 w-full flex flex-col gap-4 items-center justify-center max-w-md">
                <h2 class="text-xl font-bold">Rejoindre une partie</h2>
                <input v-model="gameId" placeholder="ID de la partie" />
                <button class="primary py-2 w-full" @click="joinGame">Rejoindre</button>
            </div>
        </div>
        <div class="flex flew-row justify-center items-center py-4 w-screen overflow-clip">

            <Card
                :card-id="cardIdSchema.options[Math.floor(Math.random() * cardIdSchema.options.length)] ?? 'garde'"
                :is-face-up="false"  
                v-for="i in 5 "
                :key="i"
                class="origin-bottom shadow-xl"
                :style="getHandCardStyle(i)"
            />
            <!-- <Card
                :card-id="cardIdSchema.options[Math.floor(Math.random() * cardIdSchema.options.length)] ?? 'garde'"
                :is-face-up="false"
            />
            <Card
                :card-id="cardIdSchema.options[Math.floor(Math.random() * cardIdSchema.options.length)] ?? 'garde'"
                :is-face-up="false"
            />
            <Card
                :card-id="cardIdSchema.options[Math.floor(Math.random() * cardIdSchema.options.length)] ?? 'garde'"
                :is-face-up="false"
            /> -->
        </div>
    </div>

</template>
