import React from "react";

export type DashboardCardProps = {
  title: string;
  icon: string; // material symbol name
  text: string;
  onClick?: () => void; // future: navigation / quick actions
  disabled?: boolean;
  variant?: "default" | "success" | "warning"; // future styling knob
};

export default function DashboardCard({
  title,
  icon,
  text,
  onClick,
  disabled,
}: DashboardCardProps) {
  const clickable = !!onClick && !disabled;

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      className={[
        "text-left bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-all",
        clickable ? "hover:shadow-md hover:border-emerald-500/30" : "",
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <span className="material-symbols-outlined text-emerald-500 text-3xl">{icon}</span>
      <h3 className="mt-4 font-bold text-lg">{title}</h3>
      <p className="text-slate-500 text-sm mt-1">{text}</p>
    </button>
  );
}
