import { Loader2, CheckCircle2, XCircle, ExternalLink, X } from 'lucide-react';
import type { TxStatus } from '../types';

interface TransactionStatusProps {
  status: TxStatus;
  txHash: string;
  errorMsg: string;
  onClose: () => void;
  onRetry?: () => void;
  label?: string;
}

export function TransactionStatus({
  status,
  txHash,
  errorMsg,
  onClose,
  onRetry,
  label = 'Transaction',
}: TransactionStatusProps) {
  if (status === 'idle') return null;

  return (
    <div className="console-wrap border border-cyan-500/12 overflow-hidden shadow-xl animate-fade-in-up">
      {/* Header */}
      <div className="console-header">
        <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-400/80 font-mono">
          ⛓ {label} Tracking
        </span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 cursor-pointer p-0.5 transition">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/20">
        <div className="flex items-start sm:items-center gap-3.5">
          {/* Status Indicators */}
          {(status === 'building' || status === 'signing') && (
            <div className="w-9 h-9 shrink-0 rounded-xl bg-cyan-500/8 border border-cyan-500/15 flex items-center justify-center shadow-inner glow-teal-sm">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            </div>
          )}
          {status === 'pending' && (
            <div className="w-9 h-9 shrink-0 rounded-xl bg-cyan-500/5 border border-cyan-500/12 flex items-center justify-center relative">
              <span className="absolute w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping opacity-60" />
              <span className="relative w-2.5 h-2.5 bg-cyan-400 rounded-full" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-9 h-9 shrink-0 rounded-xl bg-teal-500/8 border border-teal-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5 text-teal-400" />
            </div>
          )}
          {status === 'failed' && (
            <div className="w-9 h-9 shrink-0 rounded-xl bg-red-500/8 border border-red-500/15 flex items-center justify-center">
              <XCircle className="w-4.5 h-4.5 text-red-400" />
            </div>
          )}

          <div>
            <span className="text-[13px] font-bold text-white block">
              {status === 'building' && 'Building Transaction…'}
              {status === 'signing' && 'Awaiting Signature…'}
              {status === 'pending' && 'Broadcasting Transaction…'}
              {status === 'success' && 'Confirmed!'}
              {status === 'failed' && 'Execution Failed'}
            </span>

            <p className="text-[11px] text-slate-400 mt-1 leading-normal font-mono break-all max-w-[360px]">
              {status === 'building' && 'Querying account ledger sequence & parameters.'}
              {status === 'signing' && 'Verify and sign the request in your wallet extension.'}
              {status === 'pending' && `Tx Hash: ${txHash.slice(0, 16)}…`}
              {status === 'success' && 'Transaction committed to Stellar ledger.'}
              {status === 'failed' && errorMsg}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 mt-2 sm:mt-0">
          {status === 'success' && txHash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/18 text-teal-300 font-semibold border border-teal-500/15 text-[11px] transition cursor-pointer"
            >
              View Explorer
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/18 text-red-300 font-semibold border border-red-500/15 text-[11px] transition cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
