// import React from "react";
import DashboardHero from "./DashboardHero";
import DashboardCardsGrid from "./DashboardCardsGrid";
import type { EditorPageId } from "../editor/pages";

type Props = {
  onOpenEditorPage: (id: EditorPageId) => void;
  onOpenPreview: () => void;
  onOpenPublish: () => void;
  isConfigured: boolean;
};

export default function DashboardPage({
  onOpenEditorPage,
  onOpenPreview,
  onOpenPublish,
  isConfigured,
}: Props) {
  const cards = [
    {
      title: "Quick Herd Edit",
      icon: "edit_note",
      text: "Edit animals on the farm.",
      onClick: () => onOpenEditorPage("herd"),
      disabled: !isConfigured,
    },
    {
      title: "Live Preview",
      icon: "visibility",
      text: "Run the website locally and preview changes.",
      onClick: onOpenPreview,
      disabled: !isConfigured,
    },
    {
      title: "Publish",
      icon: "publish",
      text: "Build and publish the website.",
      onClick: onOpenPublish,
      disabled: !isConfigured,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <DashboardHero />
      <DashboardCardsGrid cards={cards} />
    </div>
  );
}