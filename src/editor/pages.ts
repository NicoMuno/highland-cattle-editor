export type EditorPageId = "home" | "about" | "herd" | "contact";

export type EditorPageMeta = {
  id: EditorPageId;
  label: string;
  description: string;
  icon: string; // material symbol name
};

export const EDITOR_PAGES: EditorPageMeta[] = [
  {
    id: "home",
    label: "Home Page",
    description: "Hero section, highlights, and CTA content.",
    icon: "home",
  },
  {
    id: "about",
    label: "About Us",
    description: "Story, farm values, and team content.",
    icon: "info",
  },
  {
    id: "herd",
    label: "Our Herd",
    description: "Animals, gallery, and herd details.",
    icon: "pets",
  },
  {
    id: "contact",
    label: "Contact",
    description: "Location, hours, and contact form info.",
    icon: "mail",
  },
];
