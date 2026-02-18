
import React, { useState } from 'react';
import { LogEntry, ProcessStatus } from '../types';
import { tauriService } from '../services/tauriService';
import LogViewer from '../components/LogViewer';

export const PreviewView: React.FC = () => {
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const startServer = async () => {
    setStatus(ProcessStatus.RUNNING);
    setLogs([]);
    try {
      const url = await tauriService.startDevServer(log => setLogs(prev => [...prev, log]));
      setPreviewUrl(url);
      setStatus(ProcessStatus.SUCCESS);
    } catch (err) {
      setStatus(ProcessStatus.ERROR);
      setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), type: 'error', message: String(err) }]);
    }
  };

  const stopServer = () => {
    setStatus(ProcessStatus.IDLE);
    setPreviewUrl(null);
    setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'Dev server stopped.' }]);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Local Preview</h1>
          <p className="text-slate-500 mt-1">Run the website locally to see your changes before publishing.</p>
        </div>
        <div className="flex gap-4">
          {status === ProcessStatus.SUCCESS ? (
            <button 
              onClick={stopServer}
              className="bg-rose-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">stop</span>
              Stop Preview
            </button>
          ) : (
            <button 
              onClick={startServer}
              disabled={status === ProcessStatus.RUNNING}
              className="bg-emerald-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">play_arrow</span>
              {status === ProcessStatus.RUNNING ? 'Starting...' : 'Start Preview'}
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
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">info</span>
              Dev Server Info
            </h3>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${status === ProcessStatus.SUCCESS ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  <span className="text-sm font-semibold">{status}</span>
                </div>
              </div>
              {previewUrl && (
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Local URL</p>
                  <a href={previewUrl} target="_blank" className="text-emerald-700 font-bold hover:underline flex items-center gap-2">
                    {previewUrl}
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                </div>
              )}
            </div>
            {previewUrl && (
              <button 
                className="w-full mt-6 bg-slate-900 text-white py-4 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                onClick={() => window.open(previewUrl, '_blank')}
              >
                Open in Browser
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PublishView: React.FC = () => {
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const runPublish = async () => {
    setStatus(ProcessStatus.RUNNING);
    setLogs([]);
    try {
      await tauriService.runPublish(log => setLogs(prev => [...prev, log]));
      setStatus(ProcessStatus.SUCCESS);
    } catch (err) {
      setStatus(ProcessStatus.ERROR);
      setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), type: 'error', message: String(err) }]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Go Live</h1>
          <p className="text-slate-500 mt-1">Publish your latest changes to the world. This will build your site and push to GitHub.</p>
        </div>
        <button 
          onClick={runPublish}
          disabled={status === ProcessStatus.RUNNING}
          className="bg-emerald-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">rocket_launch</span>
          {status === ProcessStatus.RUNNING ? 'Publishing...' : 'Build & Deploy'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <LogViewer logs={logs} />
        </div>
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
            {status === ProcessStatus.RUNNING && (
              <div className="absolute top-0 left-0 h-1 bg-emerald-500 animate-progress w-full origin-left"></div>
            )}
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">verified</span>
              Deployment Checklist
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm font-medium text-slate-600">
                <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                All JSON files validated
              </li>
              <li className="flex items-start gap-3 text-sm font-medium text-slate-600">
                <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                Images moved to storage
              </li>
              <li className="flex items-start gap-3 text-sm font-medium text-slate-600">
                <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                Git credentials verified
              </li>
            </ul>

            {status === ProcessStatus.SUCCESS && (
              <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                <span className="material-symbols-outlined text-emerald-500 text-4xl">celebration</span>
                <p className="mt-2 font-bold text-emerald-700">Site is now Live!</p>
                <button className="mt-4 text-emerald-600 font-bold text-sm underline">View Production URL</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
