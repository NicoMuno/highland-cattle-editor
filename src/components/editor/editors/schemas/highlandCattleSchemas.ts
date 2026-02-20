import { z } from "zod";

const SectionSchema = z.object({
  text: z.string(),
});

const HeadingSectionsSchema = z.object({
  heading: z.string(),
  sections: z.array(SectionSchema),
});

const HeadingTextSchema = z.object({
  heading: z.string(),
  text: z.string(),
});

const PropSchema = z.object({
  heading: z.string(),
  text: z.string(),
});

export const HighlandCattlePageSchema = z.object({
  title: z.string(),
  subtitle: z.string(),

  history: HeadingSectionsSchema,

  properties: z.object({
    heading: z.string(),
    prop_0: PropSchema,
    prop_1: PropSchema,
    prop_2: PropSchema,
    prop_3: PropSchema,
  }),

  appearance_heading: z.string(),

  Kopf: HeadingSectionsSchema, // note: key is "Kopf" in JSON

  body: HeadingTextSchema,
  hair: HeadingTextSchema,

  meat: z.object({
    heading: z.string(),
    subheading: z.string(),
    sections: z.array(SectionSchema),
  }),
});

export type HighlandCattlePage = z.infer<typeof HighlandCattlePageSchema>;

// ------- images -------
export const HighlandCattleImageSchema = z.object({
  description: z.string(),
  path: z.string(), // "images/pages/..."
});

export const HighlandCattleImagesSchema = z.object({
  main: HighlandCattleImageSchema,
  head: HighlandCattleImageSchema,
  body: HighlandCattleImageSchema,
  hair: HighlandCattleImageSchema,
});

export type HighlandCattleImages = z.infer<typeof HighlandCattleImagesSchema>;