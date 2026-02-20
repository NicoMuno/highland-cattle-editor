import React from "react";
import DashboardHero from "./DashboardHero";
import DashboardCardsGrid from "./DashboardCardsGrid";

export default function DashboardPage() {
  const cards = [
    {
      title: "Quick Herd Edit",
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