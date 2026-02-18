// src/views/EditorViews.tsx
import React, { useEffect, useMemo, useState } from "react";
import { tauriService } from "../services/tauriService";
import ImagePicker from "../components/ImagePicker";

// Your real repo paths (from editor/pages.ts)
const HERO_PAGE_PATH = "src/data/pages/hero.json";
const HERO_IMAGES_PATH = "src/data/images/hero.json";

// Minimal types matching your real JSON structure
type HeroPage = {
  hero_Title: string;
  hero_text: string;
  hero_footer: { heading: string; text: string; button: string };
  // keep the rest but don't care yet:
  hero_card_heading?: string;
  hero_card_0?: { heading: string; text: string };
  hero_card_1?: { heading: string; text: string };
  hero_card_2?: { heading: string; text: string };
};

type HeroImages = {
  main: { description: string; path: string };
  samples: Array<{ description: string; path: string }>;
};

type HeroVM = {
  title: string;
  subtitle: string;
  buttonText: string;
  imageUrl: string; // "images/pages/..."
};

function toVm(page: HeroPage, images: HeroImages): HeroVM {
  return {
    title: page.hero_Title ?? "",
    subtitle: page.hero_text ?? "",
    buttonText: page.hero_footer?.button ?? "",
    imageUrl: images.main?.path ?? "",
  };
}

function applyVmToModels(vm: HeroVM, page: HeroPage, images: HeroImages) {
  // mutate copies (callers should clone if needed)
  page.hero_Title = vm.title;
  page.hero_text = vm.subtitle;
  page.hero_footer = page.hero_footer ?? { heading: "", text: "", button: "" };
  page.hero_footer.button = vm.buttonText;

  images.main = images.main ?? { description: "", path: "" };
  images.main.path = vm.imageUrl;
}

export const HeroEditor: React.FC = () => {
  const [page, setPage] = useState<HeroPage | null>(null);
  const [images, setImages] = useState<HeroImages | null>(null);
  const [vm, setVm] = useState<HeroVM | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string>("Loading...");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setStatus("Loading hero data...");
        const p = await tauriService.readJson<HeroPage>(HERO_PAGE_PATH);
        const img = await tauriService.readJson<HeroImages>(HERO_IMAGES_PATH);

        setPage(p);
        setImages(img);
        setVm(toVm(p, img));
        setDirty(false);
        setStatus("Loaded ✅");
      } catch (e) {
        console.error(e);
        setStatus("Load failed: " + String(e));
      }
    })();
  }, []);

  const canSave = useMemo(() => !!vm && !!page && !!images && dirty && !isSaving, [
    vm,
    page,
    images,
    dirty,
    isSaving,
  ]);

  const handleSave = async () => {
    if (!vm || !page || !images) return;

    setIsSaving(true);
    setStatus("Saving...");
    try {
      // clone so React state remains immutable
      const pageCopy: HeroPage = JSON.parse(JSON.stringify(page));
      const imagesCopy: HeroImages = JSON.parse(JSON.stringify(images));

      applyVmToModels(vm, pageCopy, imagesCopy);

      await tauriService.writeJson(HERO_PAGE_PATH, pageCopy);
      await tauriService.writeJson(HERO_IMAGES_PATH, imagesCopy);

      setPage(pageCopy);
      setImages(imagesCopy);
      setDirty(false);
      setStatus("Saved ✅");
    } catch (e) {
      console.error(e);
      setStatus("Save failed: " + String(e));
    } finally {
      setIsSaving(false);
    }
  };

  if (!vm) {
    return <div className="text-slate-500">{status}</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hero Section</h1>
          <p className="text-slate-500 mt-1">
            Minimal v1 editor (title, text, CTA button, main image). {dirty ? "Unsaved changes" : ""}
          </p>
          <p className="text-xs text-slate-400 mt-2">{status}</p>
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="bg-emerald-500 disabled:bg-slate-300 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">{isSaving ? "sync" : "save"}</span>
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: text fields */}
        <div className="space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Main Headline</label>
            <input
              type="text"
              className="w-full rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 py-3 text-lg font-medium"
              value={vm.title}
              onChange={(e) => {
                setVm({ ...vm, title: e.target.value });
                setDirty(true);
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Supporting Text</label>
            <textarea
              rows={3}
              className="w-full rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 py-3"
              value={vm.subtitle}
              onChange={(e) => {
                setVm({ ...vm, subtitle: e.target.value });
                setDirty(true);
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">CTA Button Text</label>
            <input
              type="text"
              className="w-full rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
              value={vm.buttonText}
              onChange={(e) => {
                setVm({ ...vm, buttonText: e.target.value });
                setDirty(true);
              }}
            />
          </div>

          {/* Placeholder section */}
          <div className="pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Next (placeholder): edit hero cards + footer heading/text.
            </p>
          </div>
        </div>

        {/* Right: image */}
        <div>
          <ImagePicker
            label="Hero Background Image"
            currentUrl={vm.imageUrl}
            targetSubfolder="pages"
            onUpdate={(newRel) => {
              setVm({ ...vm, imageUrl: newRel });
              setDirty(true);
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Minimal placeholder for now. We'll wire it later once we know the real JSON for produce.
export const ProduceEditor: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">Our Produce</h1>
      <p className="text-slate-500 mt-2">
        Placeholder v1. Next step: connect this to the real JSON structure in your repo.
      </p>

      <div className="mt-6 p-6 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
        Once we confirm the produce JSON path + schema, we’ll implement:
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Load list</li>
          <li>Add/edit/remove items</li>
          <li>Image replace via Tauri dialog</li>
          <li>Save back to disk</li>
        </ul>
      </div>
    </div>
  );
};
