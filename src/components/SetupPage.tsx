import React, { useMemo, useState } from "react";
import { tauriService } from "../services/tauriService";

type Mode = "browse" | "github";

type SetupState = {
  githubToken: string;
  sourceRepoUrl: string;
  hostedRepoUrl: string;
  workspacePath: string;
};

export default function SetupPage(props: { onComplete: (workspacePath: string) => void }) {
  const [mode, setMode] = useState<Mode>("browse");

  const [form, setForm] = useState<SetupState>({
    githubToken: "",
    sourceRepoUrl: "https://github.com/my-farm/site-source.git",
    hostedRepoUrl: "https://github.com/my-farm/site-hosted.git",
    workspacePath: "",
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canContinueBrowse = useMemo(() => !!form.workspacePath, [form.workspacePath]);

  async function browse() {
    try {
      setError(null);
      setLogs((p) => [...p, "Opening folder picker..."]);

      const p = await tauriService.pickWorkspaceWithDialog();
      if (!p) {
        setLogs((prev) => [...prev, "Selection cancelled."]);
        return;
      }

      setForm((prev) => ({ ...prev, workspacePath: p }));
      setLogs((prev) => [...prev, "Workspace selected ✅"]);
    } catch (e) {
      console.error(e);
      setError("Failed to select workspace: " + String(e));
      setLogs((prev) => [...prev, "Error selecting workspace ❌"]);
    }
  }

  function continueWithBrowse() {
    if (!form.workspacePath) {
      setError("Please select a workspace folder first.");
      return;
    }
    setError(null);
    setLogs((prev) => [...prev, "Continuing with workspace folder ✅"]);
    // This is what makes App render Layout (because workspacePath becomes non-null)
    props.onComplete(form.workspacePath);
  }

  function testConnectionNoop() {
    // Per your request: do nothing (for now)
    setError(null);
    setLogs((prev) => [...prev, "Test Connection clicked (noop in MVP)."]);
  }

  return (
    <div className="space-y-10 py-10">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Connect Your Workspace</h1>
        <p className="mt-4 text-lg text-slate-500">
          Choose how you want to connect: either select an existing local folder, or enter GitHub credentials
          (mocked for now).
        </p>

        {/* Toggle */}
        <div className="mt-6 inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              mode === "browse" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setMode("browse")}
          >
            Browse Folder
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              mode === "github" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setMode("github")}
          >
            GitHub Token + URLs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* LEFT: FORM */}
        <div className="space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          {mode === "browse" ? (
            <>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500">folder</span>
                Local Workspace
              </h2>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Local Workspace Root</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-lg border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    value={form.workspacePath}
                    readOnly
                  />
                  <button
                    onClick={browse}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold text-sm transition-colors"
                  >
                    Browse
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  Select the folder that contains your <b>highland-cattle-dev</b> repository.
                </p>
              </div>

              {error && <div className="text-sm text-rose-600 font-semibold">{error}</div>}

              <button
                onClick={continueWithBrowse}
                disabled={!canContinueBrowse}
                className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500">key</span>
                Authentication
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">GitHub Fine-grained PAT</label>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    placeholder="github_pat_..."
                    value={form.githubToken}
                    onChange={(e) => setForm((p) => ({ ...p, githubToken: e.target.value }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    Stored locally in app config. Never share it. Requires <b>Contents: Read/Write</b>.
                  </p>
                </div>

                <h2 className="text-xl font-bold pt-4 border-t border-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500">account_tree</span>
                  Repository URLs
                </h2>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Source Website Repo</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    value={form.sourceRepoUrl}
                    onChange={(e) => setForm((p) => ({ ...p, sourceRepoUrl: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hosted/Deployment Repo</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    value={form.hostedRepoUrl}
                    onChange={(e) => setForm((p) => ({ ...p, hostedRepoUrl: e.target.value }))}
                  />
                </div>
              </div>

              <button
                onClick={testConnectionNoop}
                className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                Test Connection
              </button>

              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                MVP note: this button is wired but intentionally does nothing yet.
              </p>
            </>
          )}
        </div>

        {/* RIGHT: LOGS */}
        <div className="bg-slate-900 rounded-2xl p-8 text-white h-full flex flex-col">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">terminal</span>
            Setup Progress
          </h3>

          <div className="flex-1 font-mono text-sm space-y-2 overflow-y-auto max-h-[300px]">
            {logs.length === 0 ? (
              <p className="text-slate-500 italic">Choose an option to begin.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-emerald-500 shrink-0">➜</span>
                  <span className="text-slate-300">{log}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
