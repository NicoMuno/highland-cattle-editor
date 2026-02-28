import React from "react";
import Sidebar, { SidebarNavItem } from "./sidebar/Sidebar";

type NavItem<TTab extends string> = SidebarNavItem<TTab>;

type EditorDropdown<TEditorId extends string> = {
  enabled: boolean;
  isOpen: boolean;
  selected: TEditorId;
  options: { id: TEditorId; label: string }[];
  onSelect: (id: TEditorId) => void;
};

interface LayoutProps<TTab extends string, TEditorId extends string = string> {
  children: React.ReactNode;
  activeTab: TTab;
  onTabChange: (tab: TTab) => void;
  navItems: NavItem<TTab>[];
  statusLabel?: string;
  statusDotClassName?: string;
  editorDropdown?: EditorDropdown<TEditorId>;
}

export default function Layout<TTab extends string, TEditorId extends string = string>({
  children,
  activeTab,
  onTabChange,
  navItems,
  statusLabel,
  statusDotClassName,
  editorDropdown,
}: LayoutProps<TTab, TEditorId>) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar<TTab, TEditorId>
        activeTab={activeTab}
        onTabChange={onTabChange}
        navItems={navItems}
        statusLabel={statusLabel}
        statusDotClassName={statusDotClassName}
        editorDropdown={editorDropdown}
        settingsTabId={"settings" as TTab}
      />

      <main className="flex-1 overflow-y-auto relative">
        <div className="p-8 max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
