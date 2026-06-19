import React, { useState } from 'react';
import { Database, PlusCircle, ExternalLink, Loader2 } from 'lucide-react';

interface ContractActionsProps {
  contractId: string;
  walletConnected: boolean;
  onLogActivity: (action: string) => Promise<string | undefined>;
  isTransacting: boolean;
}

export function ContractActions({
  contractId,
  walletConnected,
  onLogActivity,
  isTransacting,
}: ContractActionsProps) {
  const [customAction, setCustomAction] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAction.trim() || isTransacting) return;
    try {
      await onLogActivity(customAction.trim());
      setCustomAction('');
    } catch (err) {
      // Error will be classified and displayed on error banner
    }
  };

  const truncateAddress = (addr: string): string => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}…${addr.slice(-8)}`;
  };

  return (
    <section className="card-panel rounded-xl p-5 space-y-4 animate-fade-in delay-200">
      <div>
        <h2 className="text-[13px] font-semibold text-slate-200 flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          On-Chain Logger
        </h2>
        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
          Interact directly with the deployed Soroban contract. Write a custom activity log to the ledger.
        </p>
      </div>

      <div className="card-inset rounded-xl p-4 space-y-4">
        {/* Contract ID display */}
        <div className="flex items-center justify-between text-[11px] font-mono border-b border-cyan-500/6 pb-2.5">
          <span className="text-slate-500 uppercase font-bold">Contract Address</span>
          <a
            href={`https://stellar.expert/explorer/testnet/contract/${contractId}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            {truncateAddress(contractId)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
              Action Description
            </label>
            <input
              type="text"
              value={customAction}
              onChange={(e) => setCustomAction(e.target.value)}
              disabled={!walletConnected || isTransacting}
              placeholder={walletConnected ? "e.g., Deployed App, Verified Escrow..." : "Connect wallet to write logs"}
              className="w-full bg-slate-950/60 border border-cyan-500/10 focus:border-cyan-400/50 rounded-lg px-3 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none transition font-medium"
              maxLength={100}
            />
          </div>

          <button
            type="submit"
            disabled={!walletConnected || !customAction.trim() || isTransacting}
            className="btn-primary w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-[12px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isTransacting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Submitting Log…
              </>
            ) : (
              <>
                <PlusCircle className="w-3.5 h-3.5" />
                Write On-Chain Log
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
