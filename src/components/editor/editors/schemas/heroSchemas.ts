import { z } from "zod";

export const HeroCardSchema = z.object({
  heading: z.string(),
  text: z.string(),
});

export const HeroFooterSchema = z.object({
  heading: z.string(),
  text: z.string(),
  button: z.string(),
});

export const HeroPageSchema = z.object({
  hero_Title: z.string(),
  hero_text: z.string(),
  hero_card_heading: z.string(),
  hero_card_0: HeroCardSchema,
  hero_card_1: HeroCardSchema,
  hero_card_2: HeroCardSchema,
  hero_footer: HeroFooterSchema,
});

export type HeroPage = z.infer<typeof HeroPageSchema>;

export const HeroImageItemSchema = z.object({
  description: z.string(),
  path: z.string(), // "images/pages/..."
});

export const HeroImagesSchema = z.object({
  main: HeroImageItemSchema,
  samples: z.array(HeroImageItemSchema).length(3),
});

export type HeroImages = z.infer<typeof HeroImagesSchema>;
