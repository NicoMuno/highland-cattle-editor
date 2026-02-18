import React, { useEffect, useState } from "react";
import Layout from "./components/Layout";
import SetupView from "./views/SetupView";
import { tauriService } from "./services/tauriService";
import { DashboardPage, DummyEditorPage } from "./views/Pages";

import EditorHub from "./views/EditorHub";
import { EDITOR_PAGES, EditorPageId } from "./editor/pages";

type Tab = "dashboard" | "editor" | "produce" | "preview" | "publish" | "settings";
type EditorRoute = "hub" | EditorPageId;

export default function App() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const isConfigured = !!workspacePath;

  const NAV_ITEMS: { id: Tab; label: string; icon: string; disabled?: boolean }[] = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "editor", label: "Web Editor", icon: "view_headline", disabled: !isConfigured },
    { id: "preview", label: "Live Preview", icon: "visibility", disabled: !isConfigured },
    { id: "publish", label: "Publish", icon: "publish", disabled: !isConfigured },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  // Which website page is selected inside Editor
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [editorRoute, setEditorRoute] = useState<EditorRoute>("hub");

  function selectEditorPage(id: EditorPageId) {
    setActiveTab("editor");
    setEditorRoute(id);
  }

  useEffect(() => {
    (async () => {
      const ws = await tauriService.getWorkspace();
      setWorkspacePath(ws);
      setIsInitializing(false);
    })().catch((e) => {
      console.error(e);
      setIsInitializing(false);
    });
  }, []);

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="size-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
            Loading Workspace
          </p>
        </div>
      </div>
    );
  }

  if (!workspacePath) {
    return <SetupView onComplete={(ws) => setWorkspacePath(ws)} />;
  }

  function renderContent() {
    switch (activeTab) {
      case "dashboard":
        return <DashboardPage />;
      case "editor":
        // If hub: show grid of cards
        if (editorRoute === "hub") {
          return <EditorHub onSelect={selectEditorPage} />;
        }

        // Else: show the “page editor” mock
        return (
          <div className="space-y-6">
            {/* Back Button */}
            <button
              className="text-sm font-bold text-emerald-700 hover:underline flex items-center gap-2"
              onClick={() => setEditorRoute("hub")}
            >
              <span className="material-symbols-outlined text-base">
                arrow_back
              </span>
              Back to Editor Overview
            </button>

            <DummyEditorPage
              title={`Editing: ${
                EDITOR_PAGES.find((p) => p.id === editorRoute)?.label ?? editorRoute
              }`}
              hint="Later: render the real editor for this page."
            />
          </div>
        );
      case "preview":
        return <DummyEditorPage title="Live Preview (Mock)" hint="Next: start Vite dev server + show logs." />;
      case "publish":
        return <DummyEditorPage title="Publish (Mock)" hint="Next: build + copy dist + git push." />;
      case "settings":
        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
            <p className="text-slate-500 mt-2">
              Workspace: <span className="font-mono text-xs">{workspacePath}</span>
            </p>

            <button
              className="mt-6 text-rose-600 font-bold text-sm"
              onClick={async () => {
                await tauriService.clearWorkspace();
                setWorkspacePath(null);
                setActiveTab("dashboard");
              }}
            >
              Reset Workspace Configuration
            </button>
          </div>
        );
      default:
        return <DashboardPage />;
    }
  }

  return (
    <Layout<Tab, EditorPageId>
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);

        // Optional: when user clicks editor tab, go to hub by default
        if (tab === "editor") setEditorRoute("hub");
      }}
      navItems={NAV_ITEMS}
      statusLabel={isConfigured ? "Workspace Connected" : "Setup Required"}
      statusDotClassName={isConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}
      editorDropdown={{
        enabled: isConfigured,
        isOpen: activeTab === "editor",
        selected: editorRoute === "hub" ? "home" : editorRoute, // temporary fallback for highlight
        options: EDITOR_PAGES.map((p) => ({ id: p.id, label: p.label })),
        onSelect: (id) => selectEditorPage(id),
      }}
    >
      {renderContent()}
    </Layout>
  );
}
