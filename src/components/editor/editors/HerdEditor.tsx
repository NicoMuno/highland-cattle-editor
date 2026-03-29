import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { tauriService } from "../../../services/tauriService";
import {
  CattleData,
  CattleDataSchema,
  CattleItem,
  UnsereHerdeImages,
  UnsereHerdeImagesSchema,
  UnsereHerdePage,
  UnsereHerdePageSchema,
} from "./schemas/herdSchemas";

const PAGE_PATH = "src/data/pages/unsereHerde.json";
const IMAGES_PATH = "src/data/images/unsereHerde.json";
const CATTLE_PATH = "src/data/herd/cattle.json";

function safeJsonParse<T>(raw: string, schema: z.ZodType<T>): T {
  const parsed = JSON.parse(raw);
  return schema.parse(parsed);
}
function prettyJson(obj: unknown) {
  return JSON.stringify(obj, null, 2) + "\n";
}

function publicPathToWorkspaceRelative(publicImgPath: string) {
  if (!publicImgPath?.startsWith("images/")) return null;
  return `public/${publicImgPath}`;
}

function SectionTitle(props: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-emerald-500 mt-0.5">{props.icon}</span>
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">{props.title}</h2>
        {props.subtitle && <p className="text-sm text-slate-500 mt-1">{props.subtitle}</p>}
      </div>
    </div>
  );
}

function Field(props: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-semibold text-slate-700">{props.label}</label>
        {props.hint && <span className="text-[10px] text-slate-400">{props.hint}</span>}
      </div>
      {props.children}
    </div>
  );
}

type HerdCategory = "bulls" | "cows" | "calves";

export default function HerdEditor(props: { onBack?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [page, setPage] = useState<UnsereHerdePage | null>(null);
  const [images, setImages] = useState<UnsereHerdeImages | null>(null);
  const [cattle, setCattle] = useState<CattleData | null>(null);

  const [pagePreviews, setPagePreviews] = useState<{ main: string | null; footer: string | null }>({
    main: null,
    footer: null,
  });

  // Store cattle previews by category+index
  const [cattlePreviews, setCattlePreviews] = useState<Record<string, string | null>>({});

  const isReady = useMemo(() => !!page && !!images && !!cattle, [page, images, cattle]);

  function isRealPublicImagePath(path?: string | null): path is string {
    if (!path) return false;
    if (!path.startsWith("images/")) return false;

    const lower = path.toLowerCase();
    return (
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".webp")
    );
  }

  function createEmptyCattleItem(): CattleItem {
    return {
      name: "",
      birthYear: new Date().getFullYear(),
      character: "",
      path: "", // important: no fake folder path
    };
  }

  function getCategoryLabel(cat: HerdCategory) {
    switch (cat) {
      case "bulls":
        return "Unsere Bullen";
      case "cows":
        return "Unsere Kühe";
      case "calves":
        return "Unsere Kälber";
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const [pageRaw, imgRaw, cattleRaw] = await Promise.all([
        tauriService.readText(PAGE_PATH),
        tauriService.readText(IMAGES_PATH),
        tauriService.readText(CATTLE_PATH),
      ]);

      const nextPage = safeJsonParse(pageRaw, UnsereHerdePageSchema);
      const nextImages = safeJsonParse(imgRaw, UnsereHerdeImagesSchema);
      const nextCattle = safeJsonParse(cattleRaw, CattleDataSchema);

      setPage(nextPage);
      setImages(nextImages);
      setCattle(nextCattle);

      // Page image previews
      const mainRel = publicPathToWorkspaceRelative(nextImages.main.path);
      const footerRel = publicPathToWorkspaceRelative(nextImages.footer.path);

      setPagePreviews({
        main: mainRel ? await tauriService.readImageDataUrl(mainRel) : null,
        footer: footerRel ? await tauriService.readImageDataUrl(footerRel) : null,
      });

      // Cattle previews
      const nextPrev: Record<string, string | null> = {};
      const categories: HerdCategory[] = ["bulls", "cows", "calves"];

      for (const cat of categories) {
        for (let idx = 0; idx < nextCattle[cat].length; idx++) {
          const item = nextCattle[cat][idx];
          const key = `${cat}:${idx}`;

          if (isRealPublicImagePath(item.path)) {
            const rel = publicPathToWorkspaceRelative(item.path);
            nextPrev[key] = rel ? await tauriService.readImageDataUrl(rel) : null;
          } else {
            nextPrev[key] = null;
          }
        }
      }

      setCattlePreviews(nextPrev);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    if (!page || !images || !cattle) return;

    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      await tauriService.writeText(PAGE_PATH, prettyJson(page));
      await tauriService.writeText(IMAGES_PATH, prettyJson(images));
      await tauriService.writeText(CATTLE_PATH, prettyJson(cattle));
      setStatus("Gespeichert");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function replacePageImage(which: "main" | "footer") {
    if (!images) return;
    const picked = await tauriService.pickImageFile();
    if (!picked) return;

    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const oldRel = images[which].path;

      const newRel = await tauriService.replaceImage({
        oldRelativePath: oldRel ?? null,
        newAbsPath: picked,
        targetSubfolder: "pages",
      });

      const next = { ...images, [which]: { ...images[which], path: newRel } };
      setImages(next);

      const wsRel = publicPathToWorkspaceRelative(newRel);
      const dataUrl = wsRel ? await tauriService.readImageDataUrl(wsRel) : null;
      setPagePreviews((p) => ({ ...p, [which]: dataUrl }));

      setStatus("Bild ersetzt (nicht vergessen zu speichern!)");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  function updateWeidenList(i: number, text: string) {
    if (!page) return;
    const nextList = page.weiden.list.map((x, idx) => (idx === i ? { ...x, text } : x));
    setPage({ ...page, weiden: { ...page.weiden, list: nextList } });
  }
  function addWeidenListItem() {
    if (!page) return;
    setPage({ ...page, weiden: { ...page.weiden, list: [...page.weiden.list, { text: "" }] } });
  }
  function removeWeidenListItem(i: number) {
    if (!page) return;
    const next = page.weiden.list.filter((_, idx) => idx !== i);
    setPage({ ...page, weiden: { ...page.weiden, list: next } });
  }

  function updateCattleField(cat: HerdCategory, idx: number, patch: Partial<CattleItem>) {
    if (!cattle) return;

    const nextArr = cattle[cat].map((item, i) =>
      i === idx ? { ...item, ...patch } : item
    );

    setCattle({
      ...cattle,
      [cat]: nextArr,
    });
  }

  function addCattle(cat: HerdCategory) {
    if (!cattle) return;

    const nextItem = createEmptyCattleItem();

    setCattle({
      ...cattle,
      [cat]: [...cattle[cat], nextItem],
    });

    setStatus(`${getCategoryLabel(cat)}: neues Tier hinzugefügt`);
    setError(null);
  }

  async function removeCattle(cat: HerdCategory, idx: number) {
    if (!cattle) return;

    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const item = cattle[cat][idx];
      if (!item) {
        throw new Error("Tier konnte nicht gefunden werden.");
      }

      if (isRealPublicImagePath(item.path)) {
        await tauriService.archiveImage({
          relativePath: item.path,
          targetSubfolder: "cattle",
        });
      }

      const nextArr = cattle[cat].filter((_, i) => i !== idx);

      const nextCattle = {
        ...cattle,
        [cat]: nextArr,
      };

      setCattle(nextCattle);

      setCattlePreviews((prev) => {
        const updated: Record<string, string | null> = {};

        for (const [key, value] of Object.entries(prev)) {
          const [entryCat, entryIdxRaw] = key.split(":");
          const entryIdx = Number(entryIdxRaw);

          if (entryCat !== cat) {
            updated[key] = value;
          } else if (entryIdx < idx) {
            updated[key] = value;
          } else if (entryIdx > idx) {
            updated[`${cat}:${entryIdx - 1}`] = value;
          }
        }

        return updated;
      });

      setStatus(
        isRealPublicImagePath(item.path)
          ? "Tier entfernt und Bild nach Legacy verschoben – bitte speichern!!"
          : "Tier entfernt – bitte speichern!!"
      );
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function replaceCattleImage(cat: HerdCategory, idx: number) {
    if (!cattle) return;

    const picked = await tauriService.pickImageFile();
    if (!picked) return;

    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const currentItem = cattle[cat][idx];
      if (!currentItem) {
        throw new Error("Tier konnte nicht gefunden werden.");
      }

      const oldRel = isRealPublicImagePath(currentItem.path) ? currentItem.path : null;

      const newRel = await tauriService.replaceImage({
        oldRelativePath: oldRel,
        newAbsPath: picked,
        targetSubfolder: "cattle",
      });

      const nextArr = cattle[cat].map((item, i) =>
        i === idx ? { ...item, path: newRel } : item
      );

      setCattle({
        ...cattle,
        [cat]: nextArr,
      });

      const wsRel = publicPathToWorkspaceRelative(newRel);
      const dataUrl = wsRel ? await tauriService.readImageDataUrl(wsRel) : null;

      const key = `${cat}:${idx}`;
      setCattlePreviews((prev) => ({
        ...prev,
        [key]: dataUrl,
      }));

      setStatus(oldRel ? "Tierbild ersetzt (nicht vergessen zu speichern!)" : "Tierbild hinzugefügt (nicht vergessen zu speichern!)");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
        <div className="flex items-center gap-3">
          <div className="size-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <div className="text-slate-900 font-black">Herde Editor</div>
            <div className="text-slate-500 text-sm">Lade unsereHerde + cattle.json…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {props.onBack && (
          <button
            onClick={props.onBack}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-slate-700">arrow_back</span>
            <span className="font-bold text-sm text-slate-800">Zurück</span>
          </button>
        )}

        <div className="flex-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Unsere Herde</h1>
          <p className="text-slate-500 mt-1">
            Bearbeite Inhalte aus{" "}
            <span className="font-mono text-xs">unsereHerde.json</span>,{" "}
            <span className="font-mono text-xs">images/unsereHerde.json</span> und{" "}
            <span className="font-mono text-xs">herd/cattle.json</span>.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm disabled:opacity-50"
          >
            Neu laden
          </button>
          <button
            onClick={saveAll}
            disabled={!isReady || busy}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 disabled:bg-slate-300"
          >
            Speichern
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-rose-600 mt-0.5">error</span>
            <div>
              <div className="font-black text-slate-900">Fehler</div>
              <div className="text-sm text-rose-700 mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}
      {status && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-emerald-600 mt-0.5">check_circle</span>
            <div className="text-sm text-slate-700 font-semibold">{status}</div>
          </div>
        </div>
      )}

      {!page || !images || !cattle ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-slate-600">
          Keine Daten geladen. Ist der Workspace korrekt?
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Page text */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <SectionTitle icon="description" title="Seiteninhalte" subtitle="Titel, Overview, Weiden." />

            <Field label="Titel">
              <input
                value={page.title}
                onChange={(e) => setPage({ ...page, title: e.target.value })}
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-2"
                disabled={busy}
              />
            </Field>

            <Field label="Subtitle">
              <input
                value={page.subtitle}
                onChange={(e) => setPage({ ...page, subtitle: e.target.value })}
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-2"
                disabled={busy}
              />
            </Field>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="font-black text-slate-900 text-sm">Overview (3 Felder)</div>

              <div className="space-y-3">
                {page.overview.map((o, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="font-black text-slate-900 text-sm">Kachel {i + 1}</div>

                    <Field label="Heading">
                      <input
                        value={o.heading}
                        onChange={(e) => {
                          const next = page.overview.map((x, idx) =>
                            idx === i ? { ...x, heading: e.target.value } : x
                          );
                          setPage({ ...page, overview: next });
                        }}
                        className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2"
                        disabled={busy}
                      />
                    </Field>

                    <Field label="Subheading">
                      <input
                        value={o.subheading}
                        onChange={(e) => {
                          const next = page.overview.map((x, idx) =>
                            idx === i ? { ...x, subheading: e.target.value } : x
                          );
                          setPage({ ...page, overview: next });
                        }}
                        className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2"
                        disabled={busy}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="font-black text-slate-900 text-sm">Unsere Weiden</div>

              <Field label="Titel">
                <input
                  value={page.weiden.title}
                  onChange={(e) => setPage({ ...page, weiden: { ...page.weiden, title: e.target.value } })}
                  className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                  disabled={busy}
                />
              </Field>

              <Field label="Text">
                <textarea
                  value={page.weiden.text}
                  onChange={(e) => setPage({ ...page, weiden: { ...page.weiden, text: e.target.value } })}
                  className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 min-h-[120px] bg-white"
                  disabled={busy}
                />
              </Field>

              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-700">Liste</div>
                <button
                  onClick={addWeidenListItem}
                  disabled={busy}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-50"
                >
                  Punkt hinzufügen
                </button>
              </div>

              <div className="space-y-3">
                {page.weiden.list.map((x, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-black text-slate-900 text-sm">Punkt {i + 1}</div>
                      <button
                        onClick={() => removeWeidenListItem(i)}
                        disabled={busy || page.weiden.list.length <= 1}
                        className="text-rose-600 font-bold text-xs disabled:opacity-50"
                      >
                        Entfernen
                      </button>
                    </div>

                    <input
                      value={x.text}
                      onChange={(e) => updateWeidenList(i, e.target.value)}
                      className="mt-3 w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                      disabled={busy}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Page images */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <SectionTitle icon="image" title="Seitenbilder" subtitle="Main + Footer Bild." />

            {(["main", "footer"] as const).map((k) => (
              <div key={k} className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-slate-900">{k.toUpperCase()}</div>
                    <div className="text-xs text-slate-500">{images[k].description}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">{images[k].path}</div>
                  </div>
                  <button
                    onClick={() => replacePageImage(k)}
                    disabled={busy}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm disabled:opacity-50"
                  >
                    Bild ersetzen…
                  </button>
                </div>

                <div className="aspect-[16/9] bg-slate-900 flex items-center justify-center">
                  {pagePreviews[k] ? (
                    <img src={pagePreviews[k] as string} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-slate-500 text-sm italic">Keine Vorschau verfügbar</div>
                  )}
                </div>
              </div>
            ))}

            <div className="text-[11px] text-slate-500 leading-relaxed">
              Beim Ersetzen wird das alte Bild nach <span className="font-mono">public/images/legacy/pages</span>{" "}
              verschoben und das neue Bild in <span className="font-mono">public/images/pages</span> kopiert.
              Danach speichern, damit der neue Pfad im JSON landet.
            </div>
          </div>

          {/* FULL WIDTH: Herd lists */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <SectionTitle icon="pets" title="Tiere" subtitle="Bullen, Kühe, Kälber (cattle.json)." />

            {(["bulls", "cows", "calves"] as const).map((cat) => (
              <div key={cat} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-black text-slate-900 text-sm">{getCategoryLabel(cat)}</div>
                  <button
                    onClick={() => addCattle(cat)}
                    disabled={busy}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-50"
                  >
                    {cat === "bulls"
                      ? "Bulle hinzufügen"
                      : cat === "cows"
                      ? "Kuh hinzufügen"
                      : "Kalb hinzufügen"}
                  </button>
                </div>

                {cattle[cat].length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                    Noch keine Tiere in dieser Kategorie. Über den Button oben kannst du das erste Tier anlegen.
                  </div>
                )}

                <div className="space-y-4">
                  {cattle[cat].map((item, idx) => {
                    const prevKey = `${cat}:${idx}`;
                    const preview = cattlePreviews[prevKey];

                    return (
                      <div key={prevKey} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-black text-slate-900">{item.name || "Neues Tier"}</div>
                          <button
                            onClick={() => removeCattle(cat, idx)}
                            disabled={busy}
                            className="text-rose-600 font-bold text-xs disabled:opacity-50"
                          >
                            Entfernen
                          </button>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Field label="Name">
                            <input
                              value={item.name}
                              onChange={(e) => updateCattleField(cat, idx, { name: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2"
                              disabled={busy}
                            />
                          </Field>

                          <Field label="Geburtsjahr" hint="Zahl">
                            <input
                              type="number"
                              value={item.birthYear}
                              onChange={(e) =>
                                updateCattleField(cat, idx, {
                                  birthYear: Number(e.target.value),
                                })
                              }
                              className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2"
                              disabled={busy}
                            />
                          </Field>

                          <Field label="Charakter">
                            <input
                              value={item.character}
                              onChange={(e) => updateCattleField(cat, idx, { character: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2"
                              disabled={busy}
                            />
                          </Field>
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-200 overflow-hidden">
                          <div className="p-3 bg-slate-50 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs text-slate-500">Bildpfad</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-1">
                                {item.path || "Noch kein Bild gewählt"}
                              </div>
                            </div>
                            <button
                              onClick={() => replaceCattleImage(cat, idx)}
                              disabled={busy}
                              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-50"
                            >
                              {isRealPublicImagePath(item.path) ? "Bild ersetzen…" : "Bild hinzufügen…"}
                            </button>
                          </div>

                          <div className="aspect-[16/9] bg-slate-900 flex items-center justify-center">
                            {preview ? (
                              <img src={preview} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-slate-500 text-sm italic">Keine Vorschau verfügbar</div>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-2">
                          Tierbilder landen in <span className="font-mono">public/images/cattle</span> und alte in{" "}
                          <span className="font-mono">public/images/legacy/cattle</span>.
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {busy && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
          <div className="size-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-bold">Arbeite…</div>
        </div>
      )}
    </div>
  );
}