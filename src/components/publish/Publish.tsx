import { useEffect, useMemo, useState } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import LogViewer from "../LogViewer";
import { ProcessStatus, LogEntry } from "../../types";
import { tauriService } from "../../services/tauriService";

export default function Publish() {
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [savedTokenPresent, setSavedTokenPresent] = useState<boolean>(false);
  const [tokenInput, setTokenInput] = useState<string>("");
  const [publishBusy, setPublishBusy] = useState(false);
  useEffect(() => {
    (async () => {
      const t = await tauriService.getGithubToken();
      setSavedTokenPresent(!!t);
    })().catch(() => {});
  }, []);

  const pushLog = (type: LogEntry["type"], message: string) => {
    setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString(), type, message }]);
  };

  const saveToken = async () => {
    if (!tokenInput.trim()) return;
    await tauriService.setGithubToken(tokenInput.trim());
    setTokenInput("");
    setSavedTokenPresent(true);
    pushLog("success", "GitHub token saved.");
  };

  const runPublish = async () => {
    if (publishBusy || status === ProcessStatus.RUNNING || !savedTokenPresent) {
      return;
    }

    const ok = await confirm(
      "This will commit and push your changes to GitHub. Continue?",
      {
        title: "Confirm Publish",
        kind: "warning",
        okLabel: "Publish",
        cancelLabel: "Cancel",
      }
    );

    if (!ok) {
      pushLog("info", "Publish cancelled.");
      return;
    }

    setPublishBusy(true);
    setStatus(ProcessStatus.RUNNING);
    setLogs([]);
    try {
      await tauriService.runPublish((log) => setLogs((prev) => [...prev, log]));
      setStatus(ProcessStatus.SUCCESS);
    } catch (e) {
      setStatus(ProcessStatus.ERROR);
      pushLog("error", String(e));
    } finally {
      setPublishBusy(false);
    }
  };

  const statusLabel = useMemo(() => {
    switch (status) {
      case ProcessStatus.IDLE: return "Ready";
      case ProcessStatus.RUNNING: return "Publishing…";
      case ProcessStatus.SUCCESS: return "Success";
      case ProcessStatus.ERROR: return "Error";
      default: return String(status);
    }
  }, [status]);

  const statusDotClass = useMemo(() => {
    switch (status) {
      case ProcessStatus.SUCCESS: return "bg-emerald-500 animate-pulse";
      case ProcessStatus.RUNNING: return "bg-amber-400 animate-pulse";
      case ProcessStatus.ERROR: return "bg-rose-500 animate-pulse";
      default: return "bg-slate-300";
    }
  }, [status]);

  const canPublish =
    savedTokenPresent &&
    status !== ProcessStatus.RUNNING &&
    !publishBusy;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Publish</h1>
          <p className="text-slate-500 mt-1">Commit + push to GitHub. GitHub Actions will deploy to Pages.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={runPublish}
            disabled={!canPublish}
            className={[
              "bg-emerald-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2",
              !canPublish ? "opacity-50 cursor-not-allowed" : "hover:bg-emerald-600",
            ].join(" ")}
          >
            <span className="material-symbols-outlined">rocket_launch</span>
            {status === ProcessStatus.RUNNING ? "Publishing…" : "Build & Deploy"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <LogViewer logs={logs} />
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
            {status === ProcessStatus.RUNNING && (
              <div className="absolute top-0 left-0 h-1 bg-emerald-500 animate-progress w-full origin-left" />
            )}

            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">key</span>
              GitHub Authentication
            </h3>

            {savedTokenPresent ? (
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <p className="text-sm font-semibold text-emerald-700">Token is saved!</p>
                <p className="text-xs text-emerald-700/80 mt-1">
                  You can publish from this device.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 font-medium">
                  Add a GitHub fine-grained token to enable publishing.
                </p>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="github_pat_..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
                <button
                  onClick={saveToken}
                  disabled={!tokenInput.trim()}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  Save Token
                </button>
              </div>
            )}

            <div className="mt-6 bg-slate-50 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className={`size-2 rounded-full ${statusDotClass}`} />
                <span className="text-sm font-semibold">{statusLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}