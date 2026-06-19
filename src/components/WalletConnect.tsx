import { useState } from 'react';
import { Wallet, LogOut, Copy, Check, RefreshCw } from 'lucide-react';

interface WalletConnectProps {
  walletAddress: string;
  walletName: string;
  walletIcon: string;
  balance: string;
  isUnfunded: boolean;
  isConnecting: boolean;
  isRefreshing: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefreshBalance: () => void;
}

export function WalletConnect({
  walletAddress,
  walletName,
  walletIcon,
  balance,
  isUnfunded,
  isConnecting,
  isRefreshing,
  onConnect,
  onDisconnect,
  onRefreshBalance,
}: WalletConnectProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateAddress = (addr: string): string => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
  };

  return (
    <section className="card-panel rounded-xl p-5 space-y-4 animate-fade-in delay-100">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-slate-200 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-cyan-400" />
          Wallet Integration
        </h2>
        {walletAddress && (
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1 text-[11px] text-red-400/80 hover:text-red-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect
          </button>
        )}
      </div>

      {!walletAddress ? (
        <div className="space-y-4">
          <p className="text-slate-400 text-[13px] leading-relaxed">
            Connect your wallet to deploy contracts, trigger log writes, and run faucet actions on Stellar Testnet.
          </p>

          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[13px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wallet className="w-4 h-4" />
            {isConnecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Account info */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Account ({walletName})
            </label>
            <div className="card-inset rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px]" role="img" aria-label={walletName}>
                  {walletIcon}
                </span>
                <code className="text-slate-200 text-[12px] font-medium select-all">
                  {truncateAddress(walletAddress)}
                </code>
              </div>
              <button
                onClick={copyAddress}
                className="text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer"
                title="Copy full address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Balance info */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Balance
              </label>
              <button
                onClick={onRefreshBalance}
                disabled={isRefreshing}
                className="text-cyan-400/70 hover:text-cyan-300 text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="card-inset rounded-lg px-3 py-2.5 flex items-center justify-between">
              <div>
                <span className={`text-[14px] font-bold ${isUnfunded ? 'text-amber-400' : 'text-white'}`}>
                  {balance}
                </span>
                <span className="text-[11px] text-slate-500 ml-1.5 font-medium">XLM</span>
              </div>
              {isUnfunded && (
                <span className="text-[9px] bg-amber-500/10 text-amber-400/90 font-bold px-1.5 py-0.5 rounded border border-amber-500/15">
                  UNACTIVATED
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
