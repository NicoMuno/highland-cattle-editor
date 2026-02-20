import React from "react";

export default function DummyEditorPage(props: { title: string; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">{props.title}</h1>
      <p className="text-slate-500 mt-2">
        Mockup only. {props.hint ?? "We will implement real JSON editing next."}
      </p>

      <div className="mt-8 grid gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Example field</label>
          <input
            className="w-full rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 py-3"
            placeholder="This doesn't save yet"
          />
        </div>

        <button
          className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all w-fit"
          onClick={() => alert("Mock: Save clicked")}
        >
          Save (mock)
        </button>
      </div>
    </div>
  );
}
