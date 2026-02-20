import { z } from "zod";

const TextItemSchema = z.object({
  text: z.string(),
});

export const ContactPageSchema = z.object({
  title: z.string(),
  subtitle: z.string(),

  address: z.object({
    anschrift: z.string(),
    post: z.string(),
    land: z.string(),
  }),

  phone: z.string(),
  mail: z.string(),

  visiting: z.object({
    heading: z.string(),
    subheading: z.string(),
    days: z.string(),
    hours: z.string(),
  }),

  info: z.object({
    heading: z.string(),
    sections: z.array(TextItemSchema),
    subheading: z.string(),
    list: z.array(TextItemSchema),
  }),

  map: z.object({
    heading: z.string(),
    text: z.string(),
  }),
});

export type ContactPage = z.infer<typeof ContactPageSchema>;