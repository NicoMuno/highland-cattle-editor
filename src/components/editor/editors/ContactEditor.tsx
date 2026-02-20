import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { tauriService } from "../../../services/tauriService";
import { ContactPage, ContactPageSchema } from "./schemas/contactSchemas";

const CONTACT_PAGE_PATH = "src/data/pages/kontakt.json";

function safeJsonParse<T>(raw: string, schema: z.ZodType<T>): T {
  const parsed = JSON.parse(raw);
  return schema.parse(parsed);
}
function prettyJson(obj: unknown) {
  return JSON.stringify(obj, null, 2) + "\n";
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

export default function ContactEditor(props: { onBack?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [page, setPage] = useState<ContactPage | null>(null);

  const isReady = useMemo(() => !!page, [page]);

  async function load() {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const raw = await tauriService.readText(CONTACT_PAGE_PATH);
      const next = safeJsonParse(raw, ContactPageSchema);
      setPage(next);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    if (!page) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await tauriService.writeText(CONTACT_PAGE_PATH, prettyJson(page));
      setStatus("Gespeichert ✅");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  function updateInfoSection(i: number, text: string) {
    if (!page) return;
    const nextSections = page.info.sections.map((s, idx) => (idx === i ? { ...s, text } : s));
    setPage({ ...page, info: { ...page.info, sections: nextSections } });
  }

  function addInfoSection() {
    if (!page) return;
    setPage({ ...page, info: { ...page.info, sections: [...page.info.sections, { text: "" }] } });
  }

  function removeInfoSection(i: number) {
    if (!page) return;
    const next = page.info.sections.filter((_, idx) => idx !== i);
    setPage({ ...page, info: { ...page.info, sections: next } });
  }

  function updateInfoList(i: number, text: string) {
    if (!page) return;
    const nextList = page.info.list.map((s, idx) => (idx === i ? { ...s, text } : s));
    setPage({ ...page, info: { ...page.info, list: nextList } });
  }

  function addInfoListItem() {
    if (!page) return;
    setPage({ ...page, info: { ...page.info, list: [...page.info.list, { text: "" }] } });
  }

  function removeInfoListItem(i: number) {
    if (!page) return;
    const next = page.info.list.filter((_, idx) => idx !== i);
    setPage({ ...page, info: { ...page.info, list: next } });
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
            <div className="text-slate-900 font-black">Kontakt Editor</div>
            <div className="text-slate-500 text-sm">Lade kontakt.json…</div>
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kontakt</h1>
          <p className="text-slate-500 mt-1">
            Bearbeite Inhalte aus <span className="font-mono text-xs">src/data/pages/kontakt.json</span>.
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

      {!page ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-slate-600">
          Keine Daten geladen. Ist der Workspace korrekt?
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
          <SectionTitle icon="call" title="Kontakt Inhalte" subtitle="Texte, Adresse, Besuchszeiten, Hinweise, Anfahrt." />

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

          {/* Address */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div className="font-black text-slate-900 text-sm">Adresse</div>

            <Field label="Anschrift">
              <input
                value={page.address.anschrift}
                onChange={(e) => setPage({ ...page, address: { ...page.address, anschrift: e.target.value } })}
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                disabled={busy}
              />
            </Field>

            <Field label="Post">
              <input
                value={page.address.post}
                onChange={(e) => setPage({ ...page, address: { ...page.address, post: e.target.value } })}
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                disabled={busy}
              />
            </Field>

            <Field label="Land">
              <input
                value={page.address.land}
                onChange={(e) => setPage({ ...page, address: { ...page.address, land: e.target.value } })}
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                disabled={busy}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Telefon">
              <input
                value={page.phone}
                onChange={(e) => setPage({ ...page, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-2"
                disabled={busy}
              />
            </Field>

            <Field label="E-Mail">
              <input
                value={page.mail}
                onChange={(e) => setPage({ ...page, mail: e.target.value })}
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-2"
                disabled={busy}
              />
            </Field>
          </div>

          {/* Visiting */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div className="font-black text-slate-900 text-sm">Besuchszeiten</div>

            <Field label="Heading">
              <input
                value={page.visiting.heading}
                onChange={(e) => setPage({ ...page, visiting: { ...page.visiting, heading: e.target.value } })}
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                disabled={busy}
              />
            </Field>

            <Field label="Subheading">
              <input
                value={page.visiting.subheading}
                onChange={(e) =>
                  setPage({ ...page, visiting: { ...page.visiting, subheading: e.target.value } })
                }
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                disabled={busy}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tage">
                <input
                  value={page.visiting.days}
                  onChange={(e) => setPage({ ...page, visiting: { ...page.visiting, days: e.target.value } })}
                  className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                  disabled={busy}
                />
              </Field>

              <Field label="Uhrzeit">
                <input
                  value={page.visiting.hours}
                  onChange={(e) => setPage({ ...page, visiting: { ...page.visiting, hours: e.target.value } })}
                  className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                  disabled={busy}
                />
              </Field>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div className="font-black text-slate-900 text-sm">Hinweise / Info</div>

            <Field label="Heading">
              <input
                value={page.info.heading}
                onChange={(e) => setPage({ ...page, info: { ...page.info, heading: e.target.value } })}
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                disabled={busy}
              />
            </Field>

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-700">Abschnitte</div>
              <button
                onClick={addInfoSection}
                disabled={busy}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-50"
              >
                Abschnitt hinzufügen
              </button>
            </div>

            <div className="space-y-3">
              {page.info.sections.map((s, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-black text-slate-900 text-sm">Abschnitt {i + 1}</div>
                    <button
                      onClick={() => removeInfoSection(i)}
                      disabled={busy || page.info.sections.length <= 1}
                      className="text-rose-600 font-bold text-xs disabled:opacity-50"
                    >
                      Entfernen
                    </button>
                  </div>

                  <textarea
                    value={s.text}
                    onChange={(e) => updateInfoSection(i, e.target.value)}
                    className="mt-3 w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 min-h-[90px] bg-white"
                    disabled={busy}
                  />
                </div>
              ))}
            </div>

            <Field label="Subheading (Liste)">
              <input
                value={page.info.subheading}
                onChange={(e) => setPage({ ...page, info: { ...page.info, subheading: e.target.value } })}
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                disabled={busy}
              />
            </Field>

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-700">Liste</div>
              <button
                onClick={addInfoListItem}
                disabled={busy}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-50"
              >
                Punkt hinzufügen
              </button>
            </div>

            <div className="space-y-3">
              {page.info.list.map((s, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-black text-slate-900 text-sm">Punkt {i + 1}</div>
                    <button
                      onClick={() => removeInfoListItem(i)}
                      disabled={busy || page.info.list.length <= 1}
                      className="text-rose-600 font-bold text-xs disabled:opacity-50"
                    >
                      Entfernen
                    </button>
                  </div>

                  <input
                    value={s.text}
                    onChange={(e) => updateInfoList(i, e.target.value)}
                    className="mt-3 w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                    disabled={busy}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Map */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div className="font-black text-slate-900 text-sm">Anfahrt</div>

            <Field label="Heading">
              <input
                value={page.map.heading}
                onChange={(e) => setPage({ ...page, map: { ...page.map, heading: e.target.value } })}
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 bg-white"
                disabled={busy}
              />
            </Field>

            <Field label="Text">
              <textarea
                value={page.map.text}
                onChange={(e) => setPage({ ...page, map: { ...page.map, text: e.target.value } })}
                className="w-full rounded-xl border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-3 py-2 min-h-[90px] bg-white"
                disabled={busy}
              />
            </Field>
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