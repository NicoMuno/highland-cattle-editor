import React from "react";
import DashboardHero from "../components/dashboard/DashboardHero";
import DashboardCardsGrid from "../components/dashboard/DashboardCardsGrid";

export function DashboardPage() {
  const cards = [
    {
      title: "Quick Edit",
      icon: "edit_note",
      text: "Placeholder editor page.",
      onClick: () => alert("TODO: navigate to Hero editor"),
    },
    {
      title: "Live Preview",
      icon: "visibility",
      text: "Placeholder preview page.",
      onClick: () => alert("TODO: navigate to Preview"),
    },
    {
      title: "Publish",
      icon: "publish",
      text: "Placeholder publish workflow.",
      onClick: () => alert("TODO: navigate to Publish"),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <DashboardHero />
      <DashboardCardsGrid cards={cards} />
    </div>
  );
}

// Keep DummyEditorPage here for now, or extract later similarly.
export function DummyEditorPage(props: { title: string; hint?: string }) {
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


// function Card(props: { title: string; icon: string; text: string }) {
//   return (
//     <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
//       <span className="material-symbols-outlined text-emerald-500 text-3xl">{props.icon}</span>
//       <h3 className="mt-4 font-bold text-lg">{props.title}</h3>
//       <p className="text-slate-500 text-sm mt-1">{props.text}</p>
//     </div>
//   );
// }
