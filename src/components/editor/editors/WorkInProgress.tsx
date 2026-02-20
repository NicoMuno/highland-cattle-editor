import React from "react";
import EditorPageShell from "../EditorPageShell";

export default function WorkInProgress(props: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <EditorPageShell
      title={props.title}
      description={props.description}
      icon={props.icon}
      onBack={props.onBack}
      backLabel="Back to Editor Overview"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-500 text-3xl">
            construction
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Work in Progress</h2>
            <p className="text-slate-500 mt-1 text-sm">
              This editor is not implemented yet.
            </p>
          </div>
        </div>
      </div>
    </EditorPageShell>
  );
}
