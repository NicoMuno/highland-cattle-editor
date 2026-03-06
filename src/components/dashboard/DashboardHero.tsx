// import React from "react";

export default function DashboardHero(props: {
  title?: string;
  subtitle?: string;
}) {
  const title = props.title ?? "Welcome back.";
  const subtitle =
    props.subtitle ?? "This App let's you make changes to your website.";

  return (
    <div className="bg-emerald-600 p-12 rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-emerald-500/20">
      <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
        <span className="material-symbols-outlined text-[10rem]">agriculture</span>
      </div>

      <div className="relative z-10 max-w-lg">
        <h1 className="text-4xl font-black tracking-tight leading-tight">{title}</h1>
        <p className="mt-4 text-emerald-100 text-lg font-medium opacity-90">{subtitle}</p>
      </div>
    </div>
  );
}
