// shared/cards/cards.ts
import { z } from "zod";

export const cardIdSchema = z.enum([
    "garde",
    "pretre",
    "baron",
    "servante",
    "prince",
    "roi",
    "comtesse",
    "princesse",
]);

export type CardId = z.infer<typeof cardIdSchema>;

export type CardDefinition = {
  name: string;
  value: number;
  description: string;
};

export const cards: Record<CardId, CardDefinition> = {
  garde: {
    name: "Garde",
    value: 1,
    description: "Devine la carte d'un adversaire.",
  },
  pretre: {
    name: "Prêtre",
    value: 2,
    description: "Regarde la main d'un adversaire.",
  },
  baron: {
    name: "Baron",
    value: 3,
    description: "Compare les mains.",
  },
  servante: {
    name: "Servante",
    value: 4,
    description: "Échange ta carte avec un adversaire.",
  },
  prince: {
    name: "Prince",
    value: 5,
    description: "Échange ta carte avec un adversaire.",
  },
  roi: {
    name: "Roi",
    value: 6,
    description: "Échange ta carte avec un adversaire.",
  },
  comtesse: {
    name: "Comtesse",
    value: 7,
    description: "Échange ta carte avec un adversaire.",
  },
  princesse: {
    name: "Princesse",
    value: 8,
    description: "Échange ta carte avec un adversaire.",
  },
};
