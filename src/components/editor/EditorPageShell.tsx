import React from "react";

export type EditorStatus =
  | { kind: "idle"; text?: string }
  | { kind: "dirty"; text?: string }
  | { kind: "saving"; text?: string }
  | { kind: "saved"; text?: string }
  | { kind: "error"; text: string };

type Props = {
  title: string;
  description?: string;
  icon?: React.ReactNode;

  // Top-left back navigation (optional)
  onBack?: () => void;
  backLabel?: string;

  // Right side of header: buttons etc.
  actions?: React.ReactNode;

  // Small status chip under header (optional)
  status?: EditorStatus;

  // Main editor content
  children: React.ReactNode;
};

function StatusChip({ status }: { status: EditorStatus }) {
  const base =
    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold border";

  switch (status.kind) {
    case "dirty":
      return (
        <div className={`${base} bg-amber-50 border-amber-200 text-amber-700`}>
          <span className="material-symbols-outlined text-sm">edit</span>
          {status.text ?? "Unsaved changes"}
        </div>
      );
    case "saving":
      return (
        <div className={`${base} bg-slate-50 border-slate-200 text-slate-600`}>
          <span className="material-symbols-outlined text-sm animate-spin">sync</span>
          {status.text ?? "Saving..."}
        </div>
      );
    case "saved":
      return (
        <div className={`${base} bg-emerald-50 border-emerald-200 text-emerald-700`}>
          <span className="material-symbols-outlined text-sm">check_circle</span>
          {status.text ?? "Saved"}
        </div>
      );
    case "error":
      return (
        <div className={`${base} bg-rose-50 border-rose-200 text-rose-700`}>
          <span className="material-symbols-outlined text-sm">error</span>
          {status.text}
        </div>
      );
    case "idle":
    default:
      return (
        <div className={`${base} bg-slate-50 border-slate-200 text-slate-600`}>
          <span className="material-symbols-outlined text-sm">info</span>
          {status.text ?? "Ready"}
        </div>
      );
  }
}

export default function EditorPageShell({
  title,
  description,
  icon,
  onBack,
  backLabel = "Back",
  actions,
  status,
  children
}: Props) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Back row */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-bold text-emerald-700 hover:underline flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          {backLabel}
        </button>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {icon && <div className="text-emerald-500 text-2xl">{icon}</div>}
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
          </div>

          {description && <p className="text-slate-500">{description}</p>}

          {status && <StatusChip status={status} />}
        </div>

        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {/* Body */}
      
        <div className="space-y-6">{children}</div>
      
    </div>
  );
}
