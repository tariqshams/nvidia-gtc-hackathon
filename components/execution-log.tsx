import { Terminal } from 'lucide-react';

interface ExecutionLogProps {
  logs: string[];
}

export function ExecutionLog({ logs }: ExecutionLogProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden max-h-[300px] shadow-xl">
      <div className="flex items-center gap-2 px-4 py-3 bg-neutral-950/50 border-b border-neutral-800">
        <Terminal className="w-4 h-4 text-emerald-500" />
        <span className="text-xs font-semibold text-neutral-400 font-mono tracking-wider uppercase">Agent Trace Trace</span>
      </div>
      <div className="p-4 overflow-y-auto flex-1 font-mono text-sm space-y-2">
        {logs.length === 0 ? (
          <div className="text-neutral-600 italic">Waiting for input...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="text-emerald-400/90 flex gap-3">
              <span className="text-neutral-600 select-none">[{i + 1}]</span>
              <span>{log}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
