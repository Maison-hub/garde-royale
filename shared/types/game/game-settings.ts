import { z } from "zod";

export const gameSettingsSchema = z.record(z.string(), z.unknown());

export type GameSettings = z.infer<typeof gameSettingsSchema>;
