import { useEffect, useRef } from 'react';
import { RefreshCw, Trash2, Activity, Link as ChainIcon } from 'lucide-react';
import type { ActivityEntry } from '../types';

interface ActivityFeedProps {
  logs: ActivityEntry[];
  isPolling: boolean;
  onRefresh: () => void;
  onClearLocalLogs?: () => void;
  showClearBtn?: boolean;
}

function getActionBorderColor(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes('faucet') || lower.includes('friendbot') || lower.includes('claim')) {
    return 'border-l-2 border-l-teal-400 bg-teal-500/2';
  }
  if (lower.includes('payment') || lower.includes('send') || lower.includes('sent')) {
    return 'border-l-2 border-l-cyan-400 bg-cyan-500/2';
  }
  if (lower.includes('connect')) {
    return 'border-l-2 border-l-purple-400 bg-purple-500/2';
  }
  return 'border-l-2 border-l-slate-500 bg-slate-500/2';
}

function formatRelativeTime(timestampSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestampSec;
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestampSec * 1000).toLocaleDateString();
}

export function ActivityFeed({
  logs,
  isPolling,
  onRefresh,
  onClearLocalLogs,
  showClearBtn = false,
}: ActivityFeedProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const truncateAddress = (addr: string): string => {
    if (!addr) return '';
    return `${addr.slice(0, 5)}…${addr.slice(-5)}`;
  };

  return (
    <section className="console-wrap animate-fade-in delay-300">
      {/* Console Header */}
      <div className="console-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            On-Chain Ledger Activity Feed
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/15 text-[9px] font-bold">
            <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
            LIVE
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isPolling}
            className={`text-slate-500 hover:text-slate-300 transition cursor-pointer p-1 rounded ${
              isPolling ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Refresh logs from blockchain"
          >
            <RefreshCw className={`w-3 h-3 ${isPolling ? 'animate-spin' : ''}`} />
          </button>

          {showClearBtn && onClearLocalLogs && (
            <button
              onClick={onClearLocalLogs}
              className="text-[10px] text-slate-600 hover:text-slate-300 font-mono transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Console Body */}
      <div className="console-body font-mono text-[11px] leading-relaxed space-y-2 max-h-[220px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-slate-600 italic py-4 text-center">
            No on-chain activity logs found. Interact with the dashboard to write logs.
          </div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={`${log.timestamp}-${idx}`}
              className={`p-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-cyan-500/4 transition hover:border-cyan-500/10 ${getActionBorderColor(
                log.action
              )}`}
            >
              <div className="flex items-start sm:items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-500 font-mono select-none font-bold">
                  [{new Date(log.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}]
                </span>
                
                <code className="text-cyan-400 bg-cyan-500/5 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {truncateAddress(log.user)}
                </code>

                <span className="text-slate-200 font-medium">
                  {log.action}
                </span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto select-none">
                <span className="text-[10px] text-slate-500 font-medium shrink-0">
                  {formatRelativeTime(log.timestamp)}
                </span>
                
                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-cyan-500/8">
                  <ChainIcon className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                  on-chain
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </section>
  );
}
