import React, { useEffect, useState } from "react";
import { tauriService } from "../../services/tauriService";

export default function Settings() {
  // Workspace
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [loadingWs, setLoadingWs] = useState(true);

  // GitHub token
  const [loadingToken, setLoadingToken] = useState(true);
  const [savedTokenPresent, setSavedTokenPresent] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  // Shared
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = async () => {
    setError(null);
    setLoadingWs(true);
    try {
      const ws = await tauriService.getWorkspace();
      setWorkspacePath(ws);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingWs(false);
    }
  };

  const loadToken = async () => {
    setError(null);
    setLoadingToken(true);
    try {
      const t = await tauriService.getGithubToken();
      setSavedTokenPresent(!!t);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingToken(false);
    }
  };

  useEffect(() => {
    loadWorkspace().catch(() => {});
    loadToken().catch(() => {});
  }, []);

  const changeWorkspace = async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await tauriService.pickWorkspaceWithDialog();
      if (!p) return;
      setWorkspacePath(p);
      window.location.reload(); // keep consistent with your prop-free App architecture
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const resetWorkspace = async () => {
    setBusy(true);
    setError(null);
    try {
      await tauriService.clearWorkspace();
      const ws = await tauriService.getWorkspace();
      setWorkspacePath(ws);
      window.location.reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const saveToken = async () => {
    if (!tokenInput.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await tauriService.setGithubToken(tokenInput.trim());
      setTokenInput("");
      setSavedTokenPresent(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const clearToken = async () => {
    setBusy(true);
    setError(null);
    try {
      await tauriService.clearGithubToken(); // requires step (1) + (2)
      setTokenInput("");
      setSavedTokenPresent(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Manage app configuration for this device.</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Workspace Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-700">folder</span>
          Workspace
        </h3>

        {loadingWs ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Current Workspace
              </p>
              {workspacePath ? (
                <p className="font-mono text-xs text-slate-800 break-all">{workspacePath}</p>
              ) : (
                <p className="text-sm font-semibold text-rose-600">Not configured</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => loadWorkspace().catch(() => {})}
                disabled={busy}
                className="bg-slate-200 text-slate-900 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-300 transition-all disabled:opacity-50"
              >
                Refresh
              </button>

              <button
                onClick={changeWorkspace}
                disabled={busy}
                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                Change Workspace…
              </button>

              <button
                onClick={resetWorkspace}
                disabled={busy || !workspacePath}
                className="bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Workspace
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Changing or resetting the workspace will restart the app so all pages re-load the new configuration.
            </p>
          </div>
        )}
      </div>

      {/* GitHub Token Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-600">key</span>
          GitHub Authentication
        </h3>

        {loadingToken ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : (
          <div className="space-y-4">
            {savedTokenPresent ? (
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <p className="text-sm font-semibold text-emerald-700">Token is saved ✅</p>
                <p className="text-xs text-emerald-700/80 mt-1">
                  You can publish from this device.
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-sm font-semibold text-slate-700">No token saved</p>
                <p className="text-xs text-slate-500 mt-1">
                  Add a fine-grained token to enable cloning/publishing.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                New Token
              </label>
              <input
                type="password"
                className="w-full rounded-lg border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="github_pat_..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
              <p className="text-[10px] text-slate-400">
                Stored locally in app config. Never share it.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={saveToken}
                disabled={busy || !tokenInput.trim()}
                className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
              >
                Save Token
              </button>

              <button
                onClick={() => loadToken().catch(() => {})}
                disabled={busy}
                className="bg-slate-200 text-slate-900 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-300 transition-all disabled:opacity-50"
              >
                Refresh
              </button>

              <button
                onClick={clearToken}
                disabled={busy || !savedTokenPresent}
                className="bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove the saved token from this device"
              >
                Clear Token
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}