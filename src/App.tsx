import { useState, useCallback } from 'react';
import { TransactionBuilder, Operation, Networks, Keypair } from '@stellar/stellar-sdk';
import { Zap } from 'lucide-react';

import { useWallet } from './hooks/useWallet';
import { useTransactionStatus } from './hooks/useTransactionStatus';
import { useContract } from './hooks/useContract';
import { useActivityFeed } from './hooks/useActivityFeed';
import { ErrorBanner } from './components/ErrorBanner';
import { TransactionStatus } from './components/TransactionStatus';
import { WalletConnect } from './components/WalletConnect';
import { ActivityFeed } from './components/ActivityFeed';
import { ContractActions } from './components/ContractActions';
import { classifyError } from './lib/errors';
import type { AppError } from './types';
import { horizonServer } from './lib/stellar';

const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || '';

export default function App() {
  const [logs, setLogs] = useState<Array<{ id: string; type: 'info' | 'success' | 'error'; message: string; timestamp: string }>>([]);
  const [appError, setAppError] = useState<AppError | null>(null);

  // Helper to append a console log locally
  const addLog = useCallback((type: 'info' | 'success' | 'error', message: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [
      ...prev,
      {
        id: `${now.getTime()}-${Math.random()}`,
        type,
        message,
        timestamp: timeStr,
      },
    ]);
  }, []);

  // 1. Wallet state management via kit
  const {
    walletAddress,
    walletName,
    walletIcon,
    balance,
    isUnfunded,
    isConnecting,
    isRefreshing,
    handleConnect,
    handleDisconnect,
    fetchBalance,
    signTx,
  } = useWallet(addLog);

  // 2. Transaction status tracking machines (unified or separate)
  const friendbotTx = useTransactionStatus();
  const paymentTx = useTransactionStatus();
  const contractTx = useTransactionStatus();

  // 3. Smart contract integrations
  const { logActivity } = useContract(CONTRACT_ID, walletAddress, signTx, contractTx, addLog);
  const { feed: onChainFeed, isPolling, refresh: refreshFeed } = useActivityFeed(CONTRACT_ID);

  // Helper to handle general errors
  const handleError = useCallback((err: any) => {
    const classified = classifyError(err);
    setAppError(classified);
  }, []);

  // Action: Friendbot Claim
  const handleClaimXlm = async () => {
    if (!walletAddress) return;
    setAppError(null);
    friendbotTx.setBuilding();
    addLog('info', 'Requesting 10,000 XLM from Friendbot…');

    try {
      friendbotTx.setPending();
      const resp = await fetch(`https://friendbot.stellar.org?addr=${walletAddress}`);

      if (!resp.ok) {
        const text = await resp.text();
        if (resp.status === 400 && text.includes('already funded')) {
          addLog('info', 'Account is already funded — no action needed.');
          friendbotTx.reset();
          await fetchBalance(walletAddress, true);
          return;
        }
        throw new Error(text || `HTTP ${resp.status}`);
      }

      addLog('success', 'Friendbot successfully funded your account!');
      friendbotTx.setSuccess('friendbot_claim');
      await fetchBalance(walletAddress, true);
      
      // Attempt to log faucet request on-chain
      try {
        await logActivity('Requested Faucet');
        refreshFeed();
      } catch (err) {
        console.error('Failed to log Faucet request on-chain:', err);
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      friendbotTx.setFailed(msg);
      handleError(err);
    }
  };

  // Action: Test Payment Signing
  const handleSendTransaction = async () => {
    if (!walletAddress) return;
    setAppError(null);
    paymentTx.setBuilding();
    addLog('info', 'Building a 10 XLM test payment…');

    try {
      // Pre-check balance to trigger INSUFFICIENT_BALANCE
      const accountData = await horizonServer.loadAccount(walletAddress);
      const nativeBalance = accountData.balances.find(b => b.asset_type === 'native');
      const xlmAmount = parseFloat(nativeBalance?.balance || '0');

      if (xlmAmount < 11) {
        const errorObject = new Error('Insufficient XLM balance. Request testnet funds from Friendbot first.');
        // Set type explicitly for classifier
        (errorObject as any).type = 'INSUFFICIENT_BALANCE';
        throw errorObject;
      }

      // Generate destination
      const randomKeypair = Keypair.random();
      const dest = randomKeypair.publicKey();
      addLog('info', `Destination key: ${dest.slice(0, 6)}…${dest.slice(-6)}`);

      addLog('info', 'Loading sequence number…');
      const source = await horizonServer.loadAccount(walletAddress);

      addLog('info', 'Constructing transaction…');
      const fee = await horizonServer.fetchBaseFee();
      const tx = new TransactionBuilder(source, {
        fee: fee.toString(),
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.createAccount({ destination: dest, startingBalance: '10' }))
        .setTimeout(60)
        .build();

      const xdr = tx.toXDR();
      paymentTx.setSigning();

      // Sign transaction
      const signedXdr = await signTx(xdr, walletAddress);

      paymentTx.setPending();
      addLog('info', 'Broadcasting payment transaction to Horizon…');
      
      const submitResp = await horizonServer.submitTransaction(
        TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
      );

      if (submitResp.successful) {
        paymentTx.setSuccess(submitResp.hash);
        addLog('success', `Payment transaction confirmed! Hash: ${submitResp.hash.slice(0, 12)}…`);
        await fetchBalance(walletAddress, true);

        // Attempt to log payment on-chain
        try {
          await logActivity('Sent Payment');
          refreshFeed();
        } catch (err) {
          console.error('Failed to log Payment on-chain:', err);
        }
      } else {
        throw new Error('Transaction was rejected by the network.');
      }
    } catch (err: any) {
      let detail = err?.message || String(err);
      if (err?.response?.data?.extras?.result_codes) {
        const codes = err.response.data.extras.result_codes;
        detail = `${codes.transaction || 'tx_failed'} [${(codes.operations || []).join(', ')}]`;
      }
      paymentTx.setFailed(detail);
      handleError(err);
    }
  };

  const handleCustomContractLog = async (action: string): Promise<string | undefined> => {
    setAppError(null);
    try {
      const hash = await logActivity(action);
      refreshFeed();
      return hash;
    } catch (err) {
      handleError(err);
      return undefined;
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    addLog('info', 'Console logs cleared.');
  };


  // Combine local and on-chain logs, sorting or displaying appropriately
  // For Level 2, we display the Live On-Chain feed in the dedicated ActivityFeed component,
  // and local debug steps in the console feed.
  
  return (
    <div className="min-h-screen w-full flex flex-col items-center px-4 py-12 md:py-16">
      
      {/* Error toasts */}
      <ErrorBanner
        error={appError}
        onDismiss={() => setAppError(null)}
        onFriendbotClaim={walletAddress ? handleClaimXlm : undefined}
      />

      {/* Main card wrapper */}
      <div className="w-full max-w-[640px] card-main rounded-2xl overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-cyan-500/8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg glow-teal-sm animate-float">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-white leading-tight">
                Faucet Dash <span className="text-cyan-400 text-[12px] font-mono border border-cyan-500/20 px-1.5 py-0.5 rounded ml-1 bg-cyan-500/5">L2</span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Multi-wallet & Smart Contract Tracker
              </p>
            </div>
          </div>

          <div className="network-badge">
            <span className="network-dot animate-pulse-dot" />
            Testnet Live
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          {/* Wallet Integration Section */}
          <WalletConnect
            walletAddress={walletAddress}
            walletName={walletName}
            walletIcon={walletIcon}
            balance={balance}
            isUnfunded={isUnfunded}
            isConnecting={isConnecting}
            isRefreshing={isRefreshing}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onRefreshBalance={() => fetchBalance(walletAddress, false)}
          />

          {/* Persistent Transaction Status Bars (Only render if active) */}
          <div className="space-y-3">
            <TransactionStatus
              status={friendbotTx.status}
              txHash={friendbotTx.txHash}
              errorMsg={friendbotTx.errorMsg}
              onClose={friendbotTx.reset}
              onRetry={handleClaimXlm}
              label="Friendbot Faucet"
            />
            <TransactionStatus
              status={paymentTx.status}
              txHash={paymentTx.txHash}
              errorMsg={paymentTx.errorMsg}
              onClose={paymentTx.reset}
              onRetry={handleSendTransaction}
              label="10 XLM Payment"
            />
            <TransactionStatus
              status={contractTx.status}
              txHash={contractTx.txHash}
              errorMsg={contractTx.errorMsg}
              onClose={contractTx.reset}
              label="ActivityLogger Contract"
            />
          </div>

          {/* Standard Actions Panel */}
          <section className="card-panel rounded-xl p-5 space-y-4 animate-fade-in delay-200">
            <div>
              <h2 className="text-[13px] font-semibold text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Standard Actions
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Claim Faucet */}
              <div className="card-inset rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-[12px] font-semibold text-slate-200 mb-1">
                    Request XLM
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Get 10,000 testnet lumens via Friendbot.
                  </p>
                </div>
                <button
                  onClick={handleClaimXlm}
                  disabled={!walletAddress || friendbotTx.status === 'pending' || friendbotTx.status === 'signing' || paymentTx.status === 'pending'}
                  className="btn-primary w-full py-2 px-3 rounded-lg text-[12px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Claim 10,000 XLM
                </button>
              </div>

              {/* Send Payment */}
              <div className="card-inset rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-[12px] font-semibold text-slate-200 mb-1">
                    Test Payment
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Send 10 XLM to verify transaction signing.
                  </p>
                </div>
                <button
                  onClick={handleSendTransaction}
                  disabled={!walletAddress || isUnfunded || paymentTx.status === 'pending' || paymentTx.status === 'signing' || friendbotTx.status === 'pending'}
                  className="btn-ghost w-full py-2 px-3 rounded-lg text-[12px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Send 10 XLM
                </button>
              </div>
            </div>
          </section>

          {/* Smart Contract Activity Logger Panel */}
          {CONTRACT_ID && (
            <ContractActions
              contractId={CONTRACT_ID}
              walletConnected={!!walletAddress}
              onLogActivity={handleCustomContractLog}
              isTransacting={contractTx.status === 'building' || contractTx.status === 'signing' || contractTx.status === 'pending'}
            />
          )}

          {/* Real-time Activity Feed from Contract */}
          <ActivityFeed
            logs={onChainFeed}
            isPolling={isPolling}
            onRefresh={refreshFeed}
            onClearLocalLogs={handleClearLogs}
            showClearBtn={logs.length > 0}
          />

          {/* Debug Console Log */}
          <section className="console-wrap animate-fade-in delay-300">
            <div className="console-header">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                System Console Debug Log
              </span>
              {logs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="text-[10px] text-slate-600 hover:text-slate-300 font-mono transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="console-body font-mono text-[11px] leading-relaxed space-y-1 max-h-[120px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic">
                  Console idle. Connect wallet to trigger events.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <span className="text-slate-700 shrink-0 select-none">[{log.timestamp}]</span>
                    <span
                      className={`
                        font-semibold uppercase text-[9px] px-1 py-0.5 rounded shrink-0
                        ${log.type === 'success' ? 'bg-teal-500/10 text-teal-400' : ''}
                        ${log.type === 'error' ? 'bg-red-500/10 text-red-400' : ''}
                        ${log.type === 'info' ? 'bg-cyan-500/8 text-cyan-400' : ''}
                      `}
                    >
                      {log.type}
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-cyan-500/6 flex items-center justify-center bg-slate-950/20">
          <span className="text-[10px] text-slate-600 tracking-wide">
            Built on Stellar · Testnet only · Not for real funds
          </span>
        </div>
      </div>
    </div>
  );
}
