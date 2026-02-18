// highland-cattle-editor/src/editor/pages/HeroEditor.tsx
import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

import { readJson, writeJson } from "../fs";
import {
  HeroPageSchema,
  HeroImagesSchema,
  type HeroPage,
  type HeroImages,
} from "../schemas/hero";

const HERO_PAGE_PATH = "src/data/pages/hero.json";
const HERO_IMAGES_PATH = "src/data/images/hero.json";
const HERO_CARD_KEYS = ["hero_card_0", "hero_card_1", "hero_card_2"] as const;
type HeroCardKey = typeof HERO_CARD_KEYS[number];

// Your Rust function returns paths like: "images/<subfolder>/img_<ts>.jpg"
// Your dev repo currently uses: "images/pages/..."
// So we will store into "images/pages/..." to match your structure.
const HERO_IMAGE_TARGET_SUBFOLDER = "pages";

function clone<T>(x: T): T {
  // good enough for plain JSON objects
  return JSON.parse(JSON.stringify(x)) as T;
}

export default function HeroEditor() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");

  const [heroPage, setHeroPage] = useState<HeroPage | null>(null);
  const [heroImages, setHeroImages] = useState<HeroImages | null>(null);

  const [dirty, setDirty] = useState(false);

  const canSave = useMemo(() => !!heroPage && !!heroImages && dirty, [heroPage, heroImages, dirty]);

  async function load() {
    setLoading(true);
    setStatus("Loading hero data...");
    try {
      const rawPage = await readJson<unknown>(HERO_PAGE_PATH);
      const rawImages = await readJson<unknown>(HERO_IMAGES_PATH);

      const parsedPage = HeroPageSchema.parse(rawPage);
      const parsedImages = HeroImagesSchema.parse(rawImages);

      setHeroPage(clone(parsedPage));
      setHeroImages(clone(parsedImages));
      setDirty(false);
      setStatus("Loaded ✅");
    } catch (e) {
      console.error(e);
      setStatus("Load failed: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!heroPage || !heroImages) return;

    setStatus("Validating...");
    try {
      // validate current state
      const page = HeroPageSchema.parse(heroPage);
      const images = HeroImagesSchema.parse(heroImages);

      setStatus("Saving...");
      await writeJson(HERO_PAGE_PATH, page);
      await writeJson(HERO_IMAGES_PATH, images);

      setDirty(false);
      setStatus("Saved ✅");
    } catch (e) {
      console.error(e);
      setStatus("Save failed: " + String(e));
    }
  }

  async function replaceMainImage() {
    if (!heroImages) return;

    try {
      const file = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
      });

      if (!file) {
        setStatus("Image selection cancelled.");
        return;
      }

      setStatus("Replacing image...");

      const oldRel = heroImages.main.path; // e.g. "images/pages/h_6.jpg"
      const newRel = await invoke<string>("replace_image_in_public", {
        old_relative_path: oldRel,
        new_abs_path: String(file),
        target_subfolder: HERO_IMAGE_TARGET_SUBFOLDER,
      });

      setHeroImages({
        ...heroImages,
        main: { ...heroImages.main, path: newRel },
      });
      setDirty(true);
      setStatus("Main image replaced ✅ (remember to Save)");
    } catch (e) {
      console.error(e);
      setStatus("Replace image failed: " + String(e));
    }
  }

  function updateHeroPage<K extends keyof HeroPage>(key: K, value: HeroPage[K]) {
    if (!heroPage) return;
    setHeroPage({ ...heroPage, [key]: value });
    setDirty(true);
  }

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Startseite (Hero)</h2>
        <p>{status || "Loading..."}</p>
      </div>
    );
  }

  if (!heroPage || !heroImages) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Startseite (Hero)</h2>
        <p style={{ color: "crimson" }}>Could not load hero data.</p>
        <p>{status}</p>
        <button onClick={load}>Retry</button>
      </div>
    );
  }

  return (
        <div style={{ padding: 16, maxWidth: 900 }}>
        <h2>Startseite (Hero)</h2>
        <p><b>Status:</b> {status}</p>

        <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
            <button onClick={load}>Reload</button>
            <button onClick={save} disabled={!canSave}>
            Save
            </button>
            {dirty && <span style={{ alignSelf: "center" }}>Unsaved changes</span>}
        </div>

        <hr style={{ margin: "16px 0" }} />

        {/* Main headline */}
        <div style={{ display: "grid", gap: 10 }}>
            <label>
            <div><b>Titel</b></div>
            <input
                style={{ width: "100%", padding: 8 }}
                value={heroPage.hero_Title}
                onChange={(e) => updateHeroPage("hero_Title", e.target.value)}
            />
            </label>

            <label>
            <div><b>Text</b></div>
            <textarea
                style={{ width: "100%", padding: 8, minHeight: 80 }}
                value={heroPage.hero_text}
                onChange={(e) => updateHeroPage("hero_text", e.target.value)}
            />
            </label>
        </div>

        <hr style={{ margin: "16px 0" }} />

        {/* Cards */}
        <h3>Warum Highland Cattle?</h3>

        <label>
            <div><b>Überschrift</b></div>
            <input
            style={{ width: "100%", padding: 8 }}
            value={heroPage.hero_card_heading}
            onChange={(e) => updateHeroPage("hero_card_heading", e.target.value)}
            />
        </label>


        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
        {HERO_CARD_KEYS.map((key, idx) => {
            const card = heroPage[key]; // fully typed: { heading: string; text: string; }

            return (
            <div key={key} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
                <h4>Karte {idx + 1}</h4>

                <label>
                <div>Heading</div>
                <input
                    style={{ width: "100%", padding: 8 }}
                    value={card.heading}
                    onChange={(e) => {
                    updateHeroPage(key, { ...card, heading: e.target.value });
                    }}
                />
                </label>

                <label>
                <div>Text</div>
                <textarea
                    style={{ width: "100%", padding: 8, minHeight: 70 }}
                    value={card.text}
                    onChange={(e) => {
                    updateHeroPage(key, { ...card, text: e.target.value });
                    }}
                />
                </label>
            </div>
            );
        })}
        </div>

        <hr style={{ margin: "16px 0" }} />

        {/* Footer / CTA */}
        <h3>Call to Action</h3>

        <label>
            <div><b>Heading</b></div>
            <input
            style={{ width: "100%", padding: 8 }}
            value={heroPage.hero_footer.heading}
            onChange={(e) => updateHeroPage("hero_footer", { ...heroPage.hero_footer, heading: e.target.value })}
            />
        </label>

        <label>
            <div><b>Text</b></div>
            <textarea
            style={{ width: "100%", padding: 8, minHeight: 70 }}
            value={heroPage.hero_footer.text}
            onChange={(e) => updateHeroPage("hero_footer", { ...heroPage.hero_footer, text: e.target.value })}
            />
        </label>

        <label>
            <div><b>Button Text</b></div>
            <input
            style={{ width: "100%", padding: 8 }}
            value={heroPage.hero_footer.button}
            onChange={(e) => updateHeroPage("hero_footer", { ...heroPage.hero_footer, button: e.target.value })}
            />
        </label>

        <hr style={{ margin: "16px 0" }} />

        {/* Images */}
        <h3>Bilder</h3>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
            <div><b>Main image description</b></div>
            <input
                style={{ width: "100%", padding: 8 }}
                value={heroImages.main.description}
                onChange={(e) => {
                setHeroImages({ ...heroImages, main: { ...heroImages.main, description: e.target.value } });
                setDirty(true);
                }}
            />
            <div style={{ marginTop: 8 }}><b>Main image path</b></div>
            <code>{heroImages.main.path}</code>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={replaceMainImage}>Replace main image…</button>
            </div>
        </div>

        {/* samples read-only for v1 */}
        <div style={{ marginTop: 16 }}>
            <b>Sample images (v1 read-only)</b>
            <ul>
            {heroImages.samples.map((s, idx) => (
                <li key={idx}>
                {s.description} — <code>{s.path}</code>
                </li>
            ))}
            </ul>
        </div>
        </div>
  );
}
