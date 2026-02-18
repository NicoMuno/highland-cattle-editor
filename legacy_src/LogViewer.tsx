
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogViewerProps {
  logs: LogEntry[];
}

const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex gap-1.5">
          <div className="size-2.5 rounded-full bg-rose-500"></div>
          <div className="size-2.5 rounded-full bg-amber-500"></div>
          <div className="size-2.5 rounded-full bg-emerald-500"></div>
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Process Logs</span>
      </div>
      <div 
        ref={scrollRef}
        className="p-4 h-64 overflow-y-auto font-mono text-sm space-y-1 bg-black/40"
      >
        {logs.length === 0 ? (
          <p className="text-slate-600 italic">Waiting for process output...</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-3 leading-relaxed">
              <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
              <span className={`${
                log.type === 'error' ? 'text-rose-400' : 
                log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogViewer;
