import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { tauriService } from "../../../services/tauriService";
import {
  HighlandCattleImages,
  HighlandCattleImagesSchema,
  HighlandCattlePage,
  HighlandCattlePageSchema,
} from "./schemas/highlandCattleSchemas";

const PAGE_PATH = "src/data/pages/highlandCattle.json";
const IMAGES_PATH = "src/data/images/highlandCattle.json";

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



function BlockEditor(props: {
  title: string;
  heading: string;
  text: string;
  busy?: boolean;
  onChangeHeading: (v: string) => void;
  onChangeText: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="font-black text-slate-900 text-sm">{props.title}</div>

      <Field label="Heading">
        <input
          value={props.heading}
          onChange={(e) => props.onChangeHeading(e.target.value)}
          className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
          disabled={props.busy}
        />
      </Field>

      <Field label="Text">
        <textarea
          value={props.text}
          onChange={(e) => props.onChangeText(e.target.value)}
          className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 min-h-[90px] bg-white"
          disabled={props.busy}
        />
      </Field>
    </div>
  );
}

function SectionsEditor(props: {
  title: string;
  heading: string;
  sections: { text: string }[];
  busy?: boolean;
  onChangeHeading: (v: string) => void;
  onChangeSection: (i: number, v: string) => void;
  onAddSection: () => void;
  onRemoveSection: (i: number) => void;
  minSections?: number;
}) {
  const min = props.minSections ?? 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-black text-slate-900 text-sm">{props.title}</div>
          <div className="text-xs text-slate-500">Heading + Abschnitte</div>
        </div>
        <button
          onClick={props.onAddSection}
          disabled={props.busy}
          className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-50"
        >
          Abschnitt hinzufügen
        </button>
      </div>

      <Field label="Heading">
        <input
          value={props.heading}
          onChange={(e) => props.onChangeHeading(e.target.value)}
          className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
          disabled={props.busy}
        />
      </Field>

      <div className="space-y-4">
        {props.sections.map((sec, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-black text-slate-900 text-sm">Abschnitt {i + 1}</div>
              <button
                onClick={() => props.onRemoveSection(i)}
                disabled={props.busy || props.sections.length <= min}
                className="text-rose-600 font-bold text-xs disabled:opacity-50"
              >
                Entfernen
              </button>
            </div>

            <textarea
              value={sec.text}
              onChange={(e) => props.onChangeSection(i, e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 min-h-[90px] bg-white"
              disabled={props.busy}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HighlandcattleEditor(props: { onBack?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [page, setPage] = useState<HighlandCattlePage | null>(null);
  const [images, setImages] = useState<HighlandCattleImages | null>(null);

  // previews
  const [previews, setPreviews] = useState<Record<string, string | null>>({
    main: null,
    head: null,
    body: null,
    hair: null,
  });

  const isReady = useMemo(() => !!page && !!images, [page, images]);

  async function load() {
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const [pageRaw, imgRaw] = await Promise.all([
        tauriService.readText(PAGE_PATH),
        tauriService.readText(IMAGES_PATH),
      ]);

      const nextPage = safeJsonParse(pageRaw, HighlandCattlePageSchema);
      const nextImages = safeJsonParse(imgRaw, HighlandCattleImagesSchema);

      setPage(nextPage);
      setImages(nextImages);

      const keys: (keyof HighlandCattleImages)[] = ["main", "head", "body", "hair"];
      const nextPreviews: Record<string, string | null> = { main: null, head: null, body: null, hair: null };

      for (const k of keys) {
        const rel = publicPathToWorkspaceRelative(nextImages[k].path);
        nextPreviews[k] = rel ? await tauriService.readImageDataUrl(rel) : null;
      }
      setPreviews(nextPreviews);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveAll() {
    if (!page || !images) return;
    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      await tauriService.writeText(PAGE_PATH, prettyJson(page));
      await tauriService.writeText(IMAGES_PATH, prettyJson(images));
      setStatus("Gespeichert");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function replaceImage(key: keyof HighlandCattleImages) {
    if (!images) return;

    const picked = await tauriService.pickImageFile();
    if (!picked) return;

    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const oldRel = images[key].path;

      const newRel = await tauriService.replaceImage({
        oldRelativePath: oldRel ?? null,
        newAbsPath: picked,
        targetSubfolder: "pages",
      });

      const next = { ...images, [key]: { ...images[key], path: newRel } };
      setImages(next);

      const wsRel = publicPathToWorkspaceRelative(newRel);
      const dataUrl = wsRel ? await tauriService.readImageDataUrl(wsRel) : null;
      setPreviews((p) => ({ ...p, [key]: dataUrl }));

      setStatus("Bild ersetzt (nicht vergessen zu speichern!)");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  // ---- page helpers ----
  function updateSectionsBlock(
    block: "history" | "Kopf" | "meat",
    heading?: string,
    sectionIndex?: number,
    text?: string
  ) {
    if (!page) return;

    const current = page[block];

    // meat has subheading too; handle separately
    if (block === "meat") {
      const meat = page.meat;
      const nextSections = meat.sections.map((s, i) =>
        sectionIndex === i ? { ...s, text: text ?? s.text } : s
      );
      setPage({
        ...page,
        meat: {
          ...meat,
          heading: heading ?? meat.heading,
          sections: sectionIndex === undefined ? meat.sections : nextSections,
        },
      });
      return;
    }

    const nextSections = current.sections.map((s, i) =>
      sectionIndex === i ? { ...s, text: text ?? s.text } : s
    );

    setPage({
      ...page,
      [block]: {
        ...current,
        heading: heading ?? current.heading,
        sections: sectionIndex === undefined ? current.sections : nextSections,
      },
    });
  }

  function addSection(block: "history" | "Kopf" | "meat") {
    if (!page) return;

    if (block === "meat") {
      setPage({ ...page, meat: { ...page.meat, sections: [...page.meat.sections, { text: "" }] } });
      return;
    }

    const cur = page[block];
    setPage({ ...page, [block]: { ...cur, sections: [...cur.sections, { text: "" }] } });
  }

  function removeSection(block: "history" | "Kopf" | "meat", idx: number) {
    if (!page) return;

    if (block === "meat") {
      setPage({ ...page, meat: { ...page.meat, sections: page.meat.sections.filter((_, i) => i !== idx) } });
      return;
    }

    const cur = page[block];
    setPage({ ...page, [block]: { ...cur, sections: cur.sections.filter((_, i) => i !== idx) } });
  }

  const PROP_KEYS = ["prop_0", "prop_1", "prop_2", "prop_3"] as const;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
        <div className="flex items-center gap-3">
          <div className="size-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <div className="text-slate-900 font-black">Highland Cattle Editor</div>
            <div className="text-slate-500 text-sm">Lade highlandCattle.json…</div>
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Highland Cattle</h1>
          <p className="text-slate-500 mt-1">
            Bearbeite Inhalte aus{" "}
            <span className="font-mono text-xs">src/data/pages/highlandCattle.json</span> und{" "}
            <span className="font-mono text-xs">src/data/images/highlandCattle.json</span>.
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
            <SectionTitle icon="description" title="Texte" subtitle="Inhalte aus highlandCattle.json." />

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

            <SectionsEditor
              title="Geschichte & Herkunft"
              heading={page.history.heading}
              sections={page.history.sections}
              busy={busy}
              onChangeHeading={(v) => updateSectionsBlock("history", v)}
              onChangeSection={(i, v) => updateSectionsBlock("history", undefined, i, v)}
              onAddSection={() => addSection("history")}
              onRemoveSection={(i) => removeSection("history", i)}
              minSections={1}
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="font-black text-slate-900 text-sm">Besondere Eigenschaften</div>

              <Field label="Properties Heading">
                <input
                  value={page.properties.heading}
                  onChange={(e) =>
                    setPage({ ...page, properties: { ...page.properties, heading: e.target.value } })
                  }
                  className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                  disabled={busy}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4">
                {PROP_KEYS.map((k, idx) => (
                  <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="font-black text-slate-900 text-sm">Property {idx + 1}</div>

                    <Field label="Heading">
                      <input
                        value={page.properties[k].heading}
                        onChange={(e) =>
                          setPage({
                            ...page,
                            properties: {
                              ...page.properties,
                              [k]: { ...page.properties[k], heading: e.target.value },
                            },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                        disabled={busy}
                      />
                    </Field>

                    <Field label="Text">
                      <input
                        value={page.properties[k].text}
                        onChange={(e) =>
                          setPage({
                            ...page,
                            properties: {
                              ...page.properties,
                              [k]: { ...page.properties[k], text: e.target.value },
                            },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                        disabled={busy}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </div>

            <Field label="Appearance Heading">
              <input
                value={page.appearance_heading}
                onChange={(e) => setPage({ ...page, appearance_heading: e.target.value })}
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-2"
                disabled={busy}
              />
            </Field>

            <SectionsEditor
              title="Kopf"
              heading={page.Kopf.heading}
              sections={page.Kopf.sections}
              busy={busy}
              onChangeHeading={(v) => updateSectionsBlock("Kopf", v)}
              onChangeSection={(i, v) => updateSectionsBlock("Kopf", undefined, i, v)}
              onAddSection={() => addSection("Kopf")}
              onRemoveSection={(i) => removeSection("Kopf", i)}
              minSections={1}
            />

            <BlockEditor
              title="Körper"
              heading={page.body.heading}
              text={page.body.text}
              busy={busy}
              onChangeHeading={(v) => setPage({ ...page, body: { ...page.body, heading: v } })}
              onChangeText={(v) => setPage({ ...page, body: { ...page.body, text: v } })}
            />

            <BlockEditor
              title="Haare"
              heading={page.hair.heading}
              text={page.hair.text}
              busy={busy}
              onChangeHeading={(v) => setPage({ ...page, hair: { ...page.hair, heading: v } })}
              onChangeText={(v) => setPage({ ...page, hair: { ...page.hair, text: v } })}
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="font-black text-slate-900 text-sm">Fleischqualität</div>

              <Field label="Heading">
                <input
                  value={page.meat.heading}
                  onChange={(e) => setPage({ ...page, meat: { ...page.meat, heading: e.target.value } })}
                  className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                  disabled={busy}
                />
              </Field>

              <Field label="Subheading">
                <input
                  value={page.meat.subheading}
                  onChange={(e) => setPage({ ...page, meat: { ...page.meat, subheading: e.target.value } })}
                  className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                  disabled={busy}
                />
              </Field>

              <SectionsEditor
                title="Fleisch Abschnitte"
                heading={page.meat.heading /* duplicated heading in control; keep simple */}
                sections={page.meat.sections}
                busy={busy}
                onChangeHeading={(v) => setPage({ ...page, meat: { ...page.meat, heading: v } })}
                onChangeSection={(i, v) => updateSectionsBlock("meat", undefined, i, v)}
                onAddSection={() => addSection("meat")}
                onRemoveSection={(i) => removeSection("meat", i)}
                minSections={1}
              />
            </div>
          </div>

          {/* RIGHT: Images */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <SectionTitle icon="image" title="Bilder" subtitle="4 Bilder (main + head/body/hair)." />

            {(["main", "head", "body", "hair"] as const).map((k) => (
              <div key={k} className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-slate-900">{k.toUpperCase()}</div>
                    <div className="text-xs text-slate-500">{images[k].description}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">{images[k].path}</div>
                  </div>
                  <button
                    onClick={() => replaceImage(k)}
                    disabled={busy}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm disabled:opacity-50"
                  >
                    Bild ersetzen…
                  </button>
                </div>

                <div className="aspect-[16/9] bg-slate-900 flex items-center justify-center">
                  {previews[k] ? (
                    <img src={previews[k] as string} className="w-full h-full object-cover" />
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