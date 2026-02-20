import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { tauriService } from "../../../services/tauriService";
import {
  AboutUsImages,
  AboutUsImagesSchema,
  AboutUsPage,
  AboutUsPageSchema,
} from "./schemas/aboutUsSchemas";

const ABOUT_PAGE_PATH = "src/data/pages/ueberUns.json";
const ABOUT_IMAGES_PATH = "src/data/images/ueberUns.json";

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

export default function AboutusEditor(props: { onBack?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [page, setPage] = useState<AboutUsPage | null>(null);
  const [images, setImages] = useState<AboutUsImages | null>(null);

  const [mainPreview, setMainPreview] = useState<string | null>(null);
  const [samplePreviews, setSamplePreviews] = useState<(string | null)[]>([null, null]);

  const isReady = useMemo(() => !!page && !!images, [page, images]);

  async function load() {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const [pageRaw, imgRaw] = await Promise.all([
        tauriService.readText(ABOUT_PAGE_PATH),
        tauriService.readText(ABOUT_IMAGES_PATH),
      ]);

      const nextPage = safeJsonParse(pageRaw, AboutUsPageSchema);
      const nextImages = safeJsonParse(imgRaw, AboutUsImagesSchema);

      setPage(nextPage);
      setImages(nextImages);

      const mainRel = publicPathToWorkspaceRelative(nextImages.main.path);
      setMainPreview(mainRel ? await tauriService.readImageDataUrl(mainRel) : null);

      const nextSamplePreviews: (string | null)[] = [];
      for (const s of nextImages.samples) {
        const rel = publicPathToWorkspaceRelative(s.path);
        nextSamplePreviews.push(rel ? await tauriService.readImageDataUrl(rel) : null);
      }
      setSamplePreviews(nextSamplePreviews);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    if (!page || !images) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await tauriService.writeText(ABOUT_PAGE_PATH, prettyJson(page));
      await tauriService.writeText(ABOUT_IMAGES_PATH, prettyJson(images));
      setStatus("Gespeichert ✅");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function replaceImage(field: "main" | "samples", index?: number) {
    if (!images) return;
    const picked = await tauriService.pickImageFile();
    if (!picked) return;

    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const oldRel =
        field === "main"
          ? images.main.path
          : images.samples[index!].path;

      const newRel = await tauriService.replaceImage({
        oldRelativePath: oldRel ?? null,
        newAbsPath: picked,
        targetSubfolder: "pages",
      });

      if (field === "main") {
        const next = { ...images, main: { ...images.main, path: newRel } };
        setImages(next);

        const wsRel = publicPathToWorkspaceRelative(newRel);
        setMainPreview(wsRel ? await tauriService.readImageDataUrl(wsRel) : null);
      } else {
        const nextSamples = images.samples.map((s, i) =>
          i === index ? { ...s, path: newRel } : s
        );
        const next = { ...images, samples: nextSamples };
        setImages(next);

        const wsRel = publicPathToWorkspaceRelative(newRel);
        const dataUrl = wsRel ? await tauriService.readImageDataUrl(wsRel) : null;
        setSamplePreviews((prev) => prev.map((p, i) => (i === index ? dataUrl : p)));
      }

      setStatus("Bild ersetzt ✅ (nicht vergessen zu speichern)");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  function updateStorySection(i: number, text: string) {
    if (!page) return;
    const nextSections = page.story.sections.map((s, idx) =>
      idx === i ? { ...s, text } : s
    );
    setPage({ ...page, story: { ...page.story, sections: nextSections } });
  }

  function addStorySection() {
    if (!page) return;
    setPage({
      ...page,
      story: { ...page.story, sections: [...page.story.sections, { text: "" }] },
    });
  }

  function removeStorySection(i: number) {
    if (!page) return;
    const next = page.story.sections.filter((_, idx) => idx !== i);
    setPage({ ...page, story: { ...page.story, sections: next } });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
        <div className="flex items-center gap-3">
          <div className="size-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <div className="text-slate-900 font-black">Über uns Editor</div>
            <div className="text-slate-500 text-sm">Lade ueberUns.json…</div>
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Über uns</h1>
          <p className="text-slate-500 mt-1">
            Bearbeite Inhalte aus{" "}
            <span className="font-mono text-xs">src/data/pages/ueberUns.json</span> und{" "}
            <span className="font-mono text-xs">src/data/images/ueberUns.json</span>.
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

      {!page || !images ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-slate-600">
          Keine Daten geladen. Ist der Workspace korrekt?
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Text */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <SectionTitle icon="description" title="Texte" subtitle="Inhalte aus ueberUns.json." />

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

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-black text-slate-900">Story</div>
                  <div className="text-xs text-slate-500">Heading + Abschnitte</div>
                </div>
                <button
                  onClick={addStorySection}
                  disabled={busy}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-50"
                >
                  Abschnitt hinzufügen
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <Field label="Story Heading">
                  <input
                    value={page.story.heading}
                    onChange={(e) =>
                      setPage({ ...page, story: { ...page.story, heading: e.target.value } })
                    }
                    className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-2"
                    disabled={busy}
                  />
                </Field>

                <div className="space-y-4">
                  {page.story.sections.map((sec, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-black text-slate-900 text-sm">Abschnitt {i + 1}</div>
                        <button
                          onClick={() => removeStorySection(i)}
                          disabled={busy || page.story.sections.length <= 1}
                          className="text-rose-600 font-bold text-xs disabled:opacity-50"
                        >
                          Entfernen
                        </button>
                      </div>

                      <textarea
                        value={sec.text}
                        onChange={(e) => updateStorySection(i, e.target.value)}
                        className="mt-3 w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 min-h-[90px] bg-white"
                        disabled={busy}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="font-black text-slate-900">Mission</div>
              <Field label="Heading">
                <input
                  value={page.mission.heading}
                  onChange={(e) =>
                    setPage({ ...page, mission: { ...page.mission, heading: e.target.value } })
                  }
                  className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-2"
                  disabled={busy}
                />
              </Field>
              <Field label="Text">
                <textarea
                  value={page.mission.text}
                  onChange={(e) =>
                    setPage({ ...page, mission: { ...page.mission, text: e.target.value } })
                  }
                  className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-2 min-h-[100px]"
                  disabled={busy}
                />
              </Field>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="font-black text-slate-900">Features</div>

              {(["feature_0", "feature_1"] as const).map((k, idx) => (
                <div key={k} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="font-black text-slate-900 text-sm">Feature {idx + 1}</div>

                  <Field label="Heading">
                    <input
                      value={page[k].heading}
                      onChange={(e) => setPage({ ...page, [k]: { ...page[k], heading: e.target.value } })}
                      className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                      disabled={busy}
                    />
                  </Field>

                  <Field label="Text">
                    <textarea
                      value={page[k].text}
                      onChange={(e) => setPage({ ...page, [k]: { ...page[k], text: e.target.value } })}
                      className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 min-h-[90px] bg-white"
                      disabled={busy}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Images */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <SectionTitle icon="image" title="Bilder" subtitle="Vorschau wird direkt aus dem Workspace geladen." />

            {/* Main image */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 flex items-center justify-between gap-3">
                <div>
                  <div className="font-black text-slate-900">Main</div>
                  <div className="text-xs text-slate-500">{images.main.description}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">{images.main.path}</div>
                </div>
                <button
                  onClick={() => replaceImage("main")}
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm disabled:opacity-50"
                >
                  Bild ersetzen…
                </button>
              </div>

              <div className="aspect-[16/9] bg-slate-900 flex items-center justify-center">
                {mainPreview ? (
                  <img src={mainPreview} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-slate-500 text-sm italic">Keine Vorschau verfügbar</div>
                )}
              </div>
            </div>

            {/* Samples */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {images.samples.map((s, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-3 bg-slate-50">
                    <div className="font-black text-slate-900 text-sm">Sample {i + 1}</div>
                    <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">{s.description}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">{s.path}</div>

                    <button
                      onClick={() => replaceImage("samples", i)}
                      disabled={busy}
                      className="mt-3 w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs disabled:opacity-50"
                    >
                      Replace…
                    </button>
                  </div>

                  <div className="aspect-square bg-slate-900 flex items-center justify-center">
                    {samplePreviews[i] ? (
                      <img src={samplePreviews[i] as string} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-500 text-xs italic px-3 text-center">
                        Keine Vorschau
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-slate-500 leading-relaxed">
              Beim Ersetzen wird das alte Bild nach <span className="font-mono">public/images/legacy/pages</span>{" "}
              verschoben und das neue Bild in <span className="font-mono">public/images/pages</span> kopiert.
              Danach speichern, damit der neue Pfad im JSON landet.
            </div>
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