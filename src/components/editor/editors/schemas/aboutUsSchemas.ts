import { z } from "zod";

export const AboutUsSectionSchema = z.object({
  text: z.string(),
});

export const AboutUsStorySchema = z.object({
  heading: z.string(),
  sections: z.array(AboutUsSectionSchema),
});

export const AboutUsBlockSchema = z.object({
  heading: z.string(),
  text: z.string(),
});

export const AboutUsPageSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  story: AboutUsStorySchema,
  mission: AboutUsBlockSchema,
  feature_0: AboutUsBlockSchema,
  feature_1: AboutUsBlockSchema,
});

export type AboutUsPage = z.infer<typeof AboutUsPageSchema>;

// ----- images -----
export const AboutUsImageItemSchema = z.object({
  description: z.string(),
  path: z.string(), // "images/pages/..."
});

export const AboutUsImagesSchema = z.object({
  main: AboutUsImageItemSchema,
  samples: z.array(AboutUsImageItemSchema).length(2),
});

export type AboutUsImages = z.infer<typeof AboutUsImagesSchema>;