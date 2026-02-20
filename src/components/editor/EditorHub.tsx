import React from "react";
import { EDITOR_PAGES, EditorPageId } from "./pages";

export default function EditorHub(props: { onSelect: (id: EditorPageId) => void }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Website Editor</h1>
          <p className="text-slate-500 mt-2">
            Choose a page to edit. You can also use the sidebar dropdown.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {EDITOR_PAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => props.onSelect(p.id)}
            className="text-left bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="text-emerald-500 text-2xl">
                    {p.icon}
                  </div>
                  <h3 className="font-extrabold text-lg text-slate-900">{p.label}</h3>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">{p.description}</p>
              </div>

              <span className="material-symbols-outlined text-slate-300 group-hover:text-emerald-500 transition-colors">
                arrow_forward
              </span>
            </div>

            <div className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span className="material-symbols-outlined text-sm">edit</span>
              Open editor
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
