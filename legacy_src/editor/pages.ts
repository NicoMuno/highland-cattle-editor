export type PageKey = "hero" | "ueberUns" | "unsereHerde" | "kontakt" | "highlandCattle" | "cattle";

export const PAGES: { key: PageKey; title: string; files: string[]}[] = [
  { key: "hero", title: "Startseite", files: ["src/data/pages/hero.json", "src/data/images/hero.json"] },
  { key: "ueberUns", title: "Über uns", files: ["src/data/pages/ueberUns.json", "src/data/images/ueberUns.json"] },
  { key: "unsereHerde", title: "Unsere Herde", files: ["src/data/pages/unsereHerde.json", "src/data/images/unsereHerde.json", "src/data/herd/cattle.json"] },
  { key: "kontakt", title: "Kontakt", files: ["src/data/pages/kontakt.json"] },
  { key: "highlandCattle", title: "Highland Cattle", files: ["src/data/pages/highlandCattle.json", "src/data/images/highlandCattle.json"] },
  { key: "cattle", title: "Herde (Tiere)", files: ["src/data/herd/cattle.json"] },
];