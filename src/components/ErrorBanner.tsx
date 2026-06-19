import { useEffect } from 'react';
import { AlertCircle, X, Info, HelpCircle } from 'lucide-react';
import type { AppError } from '../types';

interface ErrorBannerProps {
  error: AppError | null;
  onDismiss: () => void;
  onFriendbotClaim?: () => void;
}

export function ErrorBanner({ error, onDismiss, onFriendbotClaim }: ErrorBannerProps) {
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 8000);
    return () => clearTimeout(timer);
  }, [error, onDismiss]);

  if (!error) return null;

  const renderContent = () => {
    switch (error.type) {
      case 'WALLET_NOT_FOUND':
        return (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
            <HelpCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-[13px] block mb-0.5 text-white">Wallet Not Installed</span>
              <p className="text-[12px] text-amber-200/80 leading-relaxed">
                {error.message}{' '}
                <a
                  href="https://www.freighter.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold text-cyan-400 hover:text-cyan-300 ml-1 inline-flex items-center gap-0.5"
                >
                  Get Freighter Wallet
                </a>
              </p>
            </div>
            <button onClick={onDismiss} className="text-amber-400/70 hover:text-amber-200 p-0.5 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      case 'USER_REJECTED':
        return (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200">
            <Info className="w-5 h-5 shrink-0 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-[13px] block mb-0.5 text-white">Transaction Rejected</span>
              <p className="text-[12px] text-blue-200/80 leading-relaxed">{error.message}</p>
            </div>
            <button onClick={onDismiss} className="text-blue-400/70 hover:text-blue-200 p-0.5 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      case 'INSUFFICIENT_BALANCE':
        return (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-[13px] block mb-0.5 text-white">Insufficient XLM Balance</span>
              <p className="text-[12px] text-red-200/80 leading-relaxed mb-2.5">{error.message}</p>
              {onFriendbotClaim && (
                <button
                  onClick={() => {
                    onFriendbotClaim();
                    onDismiss();
                  }}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 text-red-100 text-[11px] font-bold rounded-lg transition cursor-pointer"
                >
                  Request Friendbot XLM
                </button>
              )}
            </div>
            <button onClick={onDismiss} className="text-red-400/70 hover:text-red-200 p-0.5 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      default:
        return (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-200">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-[13px] block mb-0.5 text-white">Error Occurred</span>
              <p className="text-[12px] text-red-200/80 font-mono break-all leading-relaxed">{error.message}</p>
            </div>
            <button onClick={onDismiss} className="text-red-400/70 hover:text-red-200 p-0.5 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[580px] px-4 animate-fade-in-up">
      <div className="shadow-2xl shadow-black/60 rounded-xl overflow-hidden backdrop-blur-md">
        {renderContent()}
      </div>
    </div>
  );
}
