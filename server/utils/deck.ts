import type { CardId } from "~~/shared/game/cards";

export class Deck {
    private cards: CardId[] = [];
    private discardedCards: CardId[] = [];
    private firedCard: CardId | null = null;

    constructor() {
        this.initializeDeck();
    }

    private initializeDeck() {
        // Initialize the deck with all cards
        for (let i = 0; i < 6; i++) {
        this.cards.push("garde");
        }
        for (let i = 0; i < 2; i++) {
        this.cards.push("pretre");
        }
        for (let i = 0; i < 2; i++) {
        this.cards.push("baron");
        }
        for (let i = 0; i < 2; i++) {
        this.cards.push("servante");
        }
        for (let i = 0; i < 2; i++) {
        this.cards.push("prince");
        }
        this.cards.push("roi");
        this.cards.push("comtesse");
        this.cards.push("princesse");
    }

    public drawCard(): CardId | undefined {
        return this.cards.pop();
    }

    public shuffle() {
    // Shuffle the deck
    for (let i = this.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.cards[i], this.cards[j]] = [this.cards[j]!, this.cards[i]!];
    }
    }

    /**
     * Fire a card typically at the start of the game, removing it from the deck and setting it aside. This card will not be used in the game.
     */
    public fireCard() {
        if (this.firedCard) {
            throw new Error("A card has already been fired.");
        }
        this.firedCard = this.cards.pop() ?? null;
    }

}