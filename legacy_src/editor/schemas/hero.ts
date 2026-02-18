import { z } from "zod";

export const HeroPageSchema = z.object({
  hero_Title: z.string(),
  hero_text: z.string(),
  hero_card_heading: z.string(),
  hero_card_0: z.object({ heading: z.string(), text: z.string() }),
  hero_card_1: z.object({ heading: z.string(), text: z.string() }),
  hero_card_2: z.object({ heading: z.string(), text: z.string() }),
  hero_footer: z.object({ heading: z.string(), text: z.string(), button: z.string() }),
});

export const ImageItemSchema = z.object({
  description: z.string(),
  path: z.string(), // "images/..."
});

export const HeroImagesSchema = z.object({
  main: ImageItemSchema,
  samples: z.array(ImageItemSchema),
});

export type HeroPage = z.infer<typeof HeroPageSchema>;
export type HeroImages = z.infer<typeof HeroImagesSchema>;
