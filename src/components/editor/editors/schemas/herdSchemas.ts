import { z } from "zod";

export const TextItemSchema = z.object({ text: z.string() });

export const UnsereHerdePageSchema = z.object({
  title: z.string(),
  subtitle: z.string(),

  overview: z.array(
    z.object({
      heading: z.string(),
      subheading: z.string(),
    })
  ),

  weiden: z.object({
    title: z.string(),
    text: z.string(),
    list: z.array(TextItemSchema),
  }),
});

export type UnsereHerdePage = z.infer<typeof UnsereHerdePageSchema>;

export const UnsereHerdeImagesSchema = z.object({
  main: z.object({
    description: z.string(),
    path: z.string(),
  }),
  footer: z.object({
    description: z.string(),
    path: z.string(),
  }),
});

export type UnsereHerdeImages = z.infer<typeof UnsereHerdeImagesSchema>;

export const CattleItemSchema = z.object({
  name: z.string(),
  birthYear: z.number().int(),
  character: z.string(),
  path: z.string(),
});

export type CattleItem = z.infer<typeof CattleItemSchema>;

export const CattleDataSchema = z.object({
  bulls: z.array(CattleItemSchema),
  cows: z.array(CattleItemSchema),
  calves: z.array(CattleItemSchema),
});

export type CattleData = z.infer<typeof CattleDataSchema>;