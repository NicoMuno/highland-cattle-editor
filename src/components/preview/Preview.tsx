import React, { useEffect, useRef, useState } from "react";
import LogViewer from "../LogViewer";
import { tauriService } from "../../services/tauriService";
import { LogEntry, ProcessStatus } from "../../types";


export default function Preview() {
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const unlistenRef = useRef<null | (() => void)>(null);
  const resetChanges = async () => {
    // Simple confirm dialog (fine for now)
    const ok = window.confirm(
      "This will discard ALL uncommitted changes in your website repo (git reset --hard + git clean -fd).\n\nContinue?"
    );
    if (!ok) return;

    // If server is running, enforce stop first (matches backend rule)
    if (status === ProcessStatus.RUNNING || status === ProcessStatus.SUCCESS) {
      // If SUCCESS, server is likely running; you can force the user to stop first.
      // Keep it strict to avoid confusing file watcher states.
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), type: "warn", message: "Stop preview before resetting changes." },
      ]);
      return;
    }

    setLogs((prev) => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), type: "info", message: "Resetting changes..." },
    ]);

    try {
      await tauriService.resetPreviewChanges();
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), type: "success", message: "Reset complete." },
      ]);
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), type: "error", message: String(err) },
      ]);
    }
  };

  useEffect(() => {
    return () => {
      // stop listening to log events
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      // best-effort stop the dev server (ignore errors)
      tauriService.stopDevServer().catch(() => {});
    };
  }, []);

  const startServer = async () => {
    setStatus(ProcessStatus.RUNNING);
    setLogs([]);
    setPreviewUrl(null);

    try {
      const { url, unlisten } = await tauriService.startDevServer((log) =>
        setLogs((prev) => [...prev, log])
      );
      unlistenRef.current = unlisten;
      setPreviewUrl(url);
      setStatus(ProcessStatus.SUCCESS);
    } catch (err) {
      setStatus(ProcessStatus.ERROR);
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), type: "error", message: String(err) },
      ]);
    }
  };

  const stopServer = async () => {
    try {
      await tauriService.stopDevServer();
    } finally {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      setStatus(ProcessStatus.IDLE);
      setPreviewUrl(null);
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), type: "info", message: "Dev server stopped." },
      ]);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Local Preview</h1>
          <p className="text-slate-500 mt-1">Run the website locally to see your changes before publishing.</p>
        </div>

        <div className="flex gap-4">
          {status === ProcessStatus.SUCCESS ? (
            <button onClick={stopServer} className="bg-rose-500 text-white px-8 py-2.5 rounded-xl font-bold">
              Stop Preview
            </button>
          ) : (
            <button
              onClick={startServer}
              disabled={status === ProcessStatus.RUNNING}
              className="bg-emerald-500 text-white px-8 py-2.5 rounded-xl font-bold"
            >
              {status === ProcessStatus.RUNNING ? "Starting..." : "Start Preview"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <LogViewer logs={logs} />
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Dev Server Info</h3>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${status === ProcessStatus.SUCCESS ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className="text-sm font-semibold">{status}</span>
                </div>
              </div>

              {previewUrl && (
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Local URL</p>
                  <a href={previewUrl} target="_blank" className="text-emerald-700 font-bold hover:underline">
                    {previewUrl}
                  </a>
                </div>
              )}
            </div>

            {previewUrl && (
              <button
                className="w-full mt-6 bg-slate-900 text-white py-4 rounded-xl font-bold"
                onClick={() => previewUrl && tauriService.openExternal(previewUrl)}
              >
                Open in Browser
              </button>
            )}
          </div>
          <div className="sticky bottom-6 flex justify-end">
            <button
              onClick={resetChanges}
              disabled={status === ProcessStatus.RUNNING || status === ProcessStatus.SUCCESS}
              className="bg-rose-600 disabled:bg-rose-300 text-white text-sm px-2 py-1 rounded-xl shadow-lg"
              title="Discard all uncommitted changes"
            >
              Reset Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}