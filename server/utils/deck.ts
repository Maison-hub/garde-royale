import type { CardId } from "~~/shared/game/cards";
import type { PlayedCard } from "~~/shared/types/game/played-card";

export class Deck {
    private cards: CardId[] = [];
    private discardedCards: PlayedCard[] = [];
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

    /**
     * Utilisé par le Prince. Si la pioche est vide, la carte mise de côté au
     * début de la manche sert de carte de remplacement.
     */
    public drawReplacementCard(): CardId | undefined {
        const card = this.drawCard();

        if (card) {
            return card;
        }

        const firedCard = this.firedCard ?? undefined;
        this.firedCard = null;
        return firedCard;
    }

    public isEmpty(): boolean {
        return this.cards.length === 0;
    }

    public discardCard(playedCard: PlayedCard) {
        this.discardedCards.push(playedCard);
    }

    public getDiscardedCards(): readonly PlayedCard[] {
        return [...this.discardedCards];
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
