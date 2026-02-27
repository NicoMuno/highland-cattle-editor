import React, { useEffect, useState } from "react";
import Layout from "./components/Layout";
import SetupPage from "./components/SetupPage";
import DashboardPage from "./components/dashboard/DashboardPage"
import DummyEditorPage from "./components/DummyPage";

import EditorHub from "./components/editor/EditorHub";
import EditorRouter from "./components/editor/EditorRouter";
import { EDITOR_PAGES, EditorPageId } from "./components/editor/pages";

import Preview from "./components/preview/Preview";
import Publish from "./components/publish/Publish";

import { tauriService } from "./services/tauriService";

type EditorRoute = "hub" | EditorPageId;
type Tab = "dashboard" | "editor" | "produce" | "preview" | "publish" | "settings";

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
    return <SetupPage onComplete={(ws) => setWorkspacePath(ws)} />;
  }

  function renderContent() {
    switch (activeTab) {
      case "dashboard":
        return <DashboardPage />;
      case "editor":
        if (editorRoute === "hub") {
          return <EditorHub onSelect={selectEditorPage} />;
        }
        return (
          <EditorRouter
            pageId={editorRoute}
            onBack={() => setEditorRoute("hub")}
          />
        );
      case "preview":
        return <Preview />;
      case "publish":
        return <Publish />
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
