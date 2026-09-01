<script setup lang="ts">

import { cards, type CardId } from '~~/shared/game/cards';
import type { PropType } from 'vue';

const props = defineProps({
    cardId: {
        type: String as PropType<CardId>,
        required: true,
    },
    compact: {
        type: Boolean,
        default: false,
    }
});

const isFaceUp = defineModel<boolean>('isFaceUp', { required: true })


const emit = defineEmits<{
    (e: 'return-card'): void;
}>();

function returnCard() {
    isFaceUp.value = !isFaceUp.value
}

</script>

<template>
    <div @click="returnCard" 
        class="aspect-2/3 flip-container relative"
        :class="props.compact ? 'w-14 rounded-md' : 'w-32 rounded-xl'"
    >
        <div class="flipper absolute inset-0 w-full h-full"
            :class="[
                props.compact ? 'rounded-md' : 'rounded-xl',
                { 'rotate-y-180': isFaceUp },
            ]"
        >
            <div class="front border-2 border-solid border-brand-700 absolute inset-0 pattern-background"
                :class="props.compact ? 'rounded-md' : 'rounded-xl'"
            >
                <!-- front content -->
            </div>
            <div class="back absolute inset-0 bg-brand-foreground flex items-center justify-center text-brand-default text-lg font-bold border-2 border-brand-subtle text-black"
                :class="props.compact ? 'rounded-md' : 'rounded-xl'"
            >
                {{ cards[props.cardId].name }}
            </div>
        </div>
    </div>
</template>

<style scoped>
/* flip the pane when hovered */
/* .flip-container:hover .flipper, .flip-container.hover .flipper {
    transform: rotateY(180deg);
} */

/* .flip-container, .front, .back {
	width: 320px;
	height: 480px;
} */

.flip-container {
    perspective: 1000px;
}

/* flip speed goes here */
.flipper {
	transition: 0.6s;
	transform-style: preserve-3d;

	position: relative;
}

/* hide back of pane during swap */
.front, .back {
	backface-visibility: hidden;

	position: absolute;
	top: 0;
	left: 0;
}

/* front pane, placed above back */
.front {
	z-index: 2;
	/* for firefox 31 */
	transform: rotateY(0deg);
}

/* back, initially hidden pane */
.back {
	transform: rotateY(180deg);
}



/* get from https://www.magicpattern.design/tools/css-backgrounds */
.pattern-background {

    overflow: hidden;
    background-color: var(--brand-light);
}

.pattern-background::before {
    content: "";
    position: absolute;
    inset: -100%;
    transform: rotate(90deg);
    transform-origin: center;
    background-color: var(--brand-light);
    opacity: 0.9;
    background-image: linear-gradient(45deg, var(--brand-dark) 25%, transparent 25%, transparent 75%, var(--brand-default) 75%), linear-gradient(45deg, var(--brand-default) 25%, transparent 25%, transparent 75%, var(--brand-default) 75%);
    background-size: 10px 10px;
    background-position: 0 0, 5px 5px;
}

</style>
