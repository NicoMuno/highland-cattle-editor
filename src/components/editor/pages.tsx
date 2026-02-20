import type { ReactNode } from "react";
import CowIcon from "../../assets/highland_cow_emerald.svg?react";

export type EditorPageId = "home" | "about" | "herd" | "cattle" | "contact";

export type EditorPageMeta = {
  id: EditorPageId;
  label: string;
  description: string;
  icon: ReactNode;
};

export const EDITOR_PAGES: EditorPageMeta[] = [
  {
    id: "home",
    label: "Home Page",
    description: "Hero section, highlights, and CTA content.",
    icon: <span className="material-symbols-outlined">home</span>,
  },
  {
    id: "about",
    label: "About Us",
    description: "Story, farm values, and team content.",
    icon: <span className="material-symbols-outlined">info</span>,
  },
  {
    id: "herd",
    label: "Our Herd",
    description: "Animals, gallery, and herd details.",
    icon: <span className="material-symbols-outlined">pets</span>,
  },
  {
    id: "cattle",
    label: "Highland Cattle",
    description: "General Information about Highland Cattle.",
    icon: <CowIcon className="w-6 h-6 text-emerald-500" />,
  },
  {
    id: "contact",
    label: "Contact",
    description: "Location, hours, and contact form info.",
    icon: <span className="material-symbols-outlined">mail</span>,
  },
];
