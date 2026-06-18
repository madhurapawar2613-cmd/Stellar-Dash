import { useState, useEffect, useRef } from 'react';
import { isConnected, requestAccess, signTransaction } from '@stellar/freighter-api';
import { Horizon, TransactionBuilder, Operation, Networks, Keypair } from '@stellar/stellar-sdk';
import {
  Wallet,
  Send,
  Droplet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
  RefreshCw,
  ExternalLink,
  Activity,
  Trash2,
  Zap,
  Copy,
  Check,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface LogEntry {
  id: string;
  type: 'info' | 'success' | 'error';
  message: string;
  timestamp: string;
}

interface FreighterSignResult {
  signedTxXdr?: string;
  signerAddress?: string;
  error?: string;
}

// ── Freighter helper ────────────────────────────────────────

const getPublicKey = async (): Promise<string> => {
  const result = await requestAccess();
  if (result.error) {
    throw new Error(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
  }
  return result.address;
};

// ── Component ───────────────────────────────────────────────

export default function App() {
  // Wallet state
  const [hasFreighter, setHasFreighter] = useState<boolean | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.00');
  const [isUnfunded, setIsUnfunded] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Action state
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [isTransacting, setIsTransacting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Feedback
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastTxHash, setLastTxHash] = useState<string>('');
  const [lastError, setLastError] = useState<string>('');

  const logsEndRef = useRef<HTMLDivElement>(null);

  // ── Helpers ─────────────────────────────────────────────

  const addLog = (type: 'info' | 'success' | 'error', message: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [...prev, {
      id: `${now.getTime()}-${Math.random()}`,
      type,
      message,
      timestamp: timeStr,
    }]);
  };

  const truncateAddress = (addr: string): string => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
  };

  const copyAddress = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ── Freighter check on mount ────────────────────────────

  useEffect(() => {
    let retries = 0;
    const maxRetries = 10;
    const checkFreighter = async () => {
      try {
        const result = await isConnected();
        const connected = !!(result && result.isConnected);
        if (connected) {
          setHasFreighter(true);
          addLog('info', 'Freighter detected — ready to connect.');
        } else if (retries < maxRetries) {
          retries++;
          setTimeout(checkFreighter, 300);
        } else {
          setHasFreighter(false);
          addLog('error', 'Freighter extension not found in this browser.');
        }
      } catch (err) {
        if (retries < maxRetries) {
          retries++;
          setTimeout(checkFreighter, 300);
        } else {
          setHasFreighter(false);
          const msg = err instanceof Error ? err.message : String(err);
          addLog('error', `Wallet check failed: ${msg}`);
        }
      }
    };
    checkFreighter();
  }, []);

  // ── Balance ─────────────────────────────────────────────

  const fetchBalance = async (address: string, silent = false) => {
    if (!address) return;
    if (!silent) setIsRefreshing(true);

    try {
      const server = new Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(address);
      const native = account.balances.find((b) => b.asset_type === 'native');

      if (native) {
        const amount = parseFloat(native.balance);
        const formatted = amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 7,
        });
        setBalance(formatted);
        setIsUnfunded(false);
        if (!silent) addLog('success', `Balance refreshed: ${formatted} XLM`);
      } else {
        setBalance('0.00');
        setIsUnfunded(true);
        if (!silent) addLog('info', 'No native asset found on this account.');
      }
    } catch (err: unknown) {
      let is404 = false;
      let msg = 'Unknown error';
      if (err && typeof err === 'object') {
        const e = err as { response?: { status?: number }; message?: string };
        if (e.response?.status === 404) is404 = true;
        msg = e.message || String(err);
      }
      if (is404) {
        setBalance('0.00');
        setIsUnfunded(true);
        if (!silent) addLog('info', 'Account not yet funded. Claim testnet XLM to activate it.');
      } else {
        setBalance('—');
        if (!silent) addLog('error', `Balance fetch failed: ${msg}`);
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  // ── Connect / Disconnect ────────────────────────────────

  const handleConnect = async () => {
    setIsConnecting(true);
    setLastError('');
    addLog('info', 'Opening Freighter…');

    try {
      const check = await isConnected();
      if (!check || !check.isConnected) {
        setHasFreighter(false);
        addLog('error', 'Freighter is not active. Please install or enable it.');
        setIsConnecting(false);
        return;
      }
      const pubKey = await getPublicKey();
      if (!pubKey) throw new Error('Address request was cancelled.');

      setWalletAddress(pubKey);
      addLog('success', `Connected: ${truncateAddress(pubKey)}`);
      await fetchBalance(pubKey, false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(msg);
      addLog('error', `Connection failed: ${msg}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    addLog('info', `Disconnected from ${truncateAddress(walletAddress)}`);
    setWalletAddress('');
    setBalance('0.00');
    setIsUnfunded(false);
    setLastTxHash('');
    setLastError('');
  };

  // ── Friendbot claim ─────────────────────────────────────

  const handleClaimXlm = async () => {
    if (!walletAddress) return;
    setIsClaiming(true);
    setLastError('');
    setLastTxHash('');
    addLog('info', 'Requesting 10,000 XLM from Friendbot…');

    try {
      const resp = await fetch(`https://friendbot.stellar.org?addr=${walletAddress}`);

      if (!resp.ok) {
        const text = await resp.text();

        // Friendbot returns 400 when the account is already funded
        if (resp.status === 400 && text.includes('already funded')) {
          addLog('info', 'Account is already funded — no action needed.');
          await fetchBalance(walletAddress, true);
          return;
        }

        throw new Error(text || `HTTP ${resp.status}`);
      }

      addLog('success', 'Friendbot funded your account!');
      await fetchBalance(walletAddress, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(msg);
      addLog('error', `Claim failed: ${msg}`);
    } finally {
      setIsClaiming(false);
    }
  };

  // ── Send payment ────────────────────────────────────────

  const handleSendTransaction = async () => {
    if (!walletAddress) return;
    setIsTransacting(true);
    setLastError('');
    setLastTxHash('');
    addLog('info', 'Building a 10 XLM test payment…');

    try {
      const server = new Horizon.Server('https://horizon-testnet.stellar.org');

      // Generate a fresh random destination each time — avoids invalid/stale addresses
      const randomKeypair = Keypair.random();
      const dest = randomKeypair.publicKey();
      addLog('info', `Destination: ${dest.slice(0, 6)}…${dest.slice(-6)}`);

      addLog('info', 'Loading account sequence…');
      const source = await server.loadAccount(walletAddress);

      addLog('info', 'Constructing transaction…');
      const fee = await server.fetchBaseFee();
      const tx = new TransactionBuilder(source, {
        fee: fee.toString(),
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.createAccount({ destination: dest, startingBalance: '10' }))
        .setTimeout(60)
        .build();

      const xdr = tx.toXDR();
      addLog('info', 'Requesting wallet signature…');

      const result = await signTransaction(xdr, {
        networkPassphrase: Networks.TESTNET,
        address: walletAddress,
      }) as string | FreighterSignResult;

      let signedXdr = '';
      if (typeof result === 'string') {
        signedXdr = result;
      } else if (result && typeof result === 'object') {
        if (result.error) throw new Error(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
        if (result.signedTxXdr) signedXdr = result.signedTxXdr;
        else throw new Error('Transaction was not signed.');
      } else {
        throw new Error('Invalid signature response.');
      }

      addLog('info', 'Broadcasting to Stellar Testnet…');
      const signed = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
      const submitResp = await server.submitTransaction(signed);

      if (submitResp.successful) {
        setLastTxHash(submitResp.hash);
        addLog('success', `Transaction confirmed — ${submitResp.hash.slice(0, 12)}…`);
        await fetchBalance(walletAddress, true);
      } else {
        throw new Error('Transaction rejected by the network.');
      }
    } catch (err: unknown) {
      let detail = 'Unknown error';
      if (err && typeof err === 'object') {
        const e = err as {
          message?: string;
          response?: { data?: { extras?: { result_codes?: { operations?: string[]; transaction?: string } } } };
        };
        if (e.response?.data?.extras?.result_codes) {
          const codes = e.response.data.extras.result_codes;
          detail = `${codes.transaction || 'tx_failed'} [${(codes.operations || []).join(', ')}]`;
        } else {
          detail = e.message || String(err);
        }
      }
      setLastError(detail);
      addLog('error', `Transaction failed: ${detail}`);
    } finally {
      setIsTransacting(false);
    }
  };

  // ── Clear logs ──────────────────────────────────────────

  const handleClearLogs = () => {
    setLogs([]);
    addLog('info', 'Activity log cleared.');
  };

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full flex flex-col items-center px-4 py-12 md:py-16">

      {/* ═══ Main Card ═══ */}
      <div className="w-full max-w-[640px] card-main rounded-2xl overflow-hidden animate-fade-in-up">

        {/* ─── Header ─── */}
        <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-cyan-500/8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg glow-teal-sm animate-float">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-white leading-tight">
                Faucet Dash
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Stellar Testnet Faucet Interface
              </p>
            </div>
          </div>

          <div className="network-badge">
            <span className="network-dot animate-pulse-dot" />
            Testnet Live
          </div>
        </div>

        {/* ─── Body ─── */}
        <div className="p-6 space-y-5">

          {/* ── Wallet Section ── */}
          <section className="card-panel rounded-xl p-5 space-y-4 animate-fade-in delay-100">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-slate-200 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-cyan-400" />
                Wallet
              </h2>
              {walletAddress && (
                <button
                  onClick={handleDisconnect}
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
                  Connect your Freighter wallet to start using the testnet faucet.
                </p>

                {hasFreighter === false && (
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/12 text-amber-200 text-[12px]">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <span className="font-semibold block mb-0.5">Freighter not detected</span>
                      Install the browser extension to get started.
                      <a
                        href="https://www.freighter.app/"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold underline ml-1 text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                      >
                        Get Freighter <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[13px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting…
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Connect Freighter
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Address */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Account
                  </label>
                  <div className="card-inset rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                    <code className="text-slate-200 text-[12px] font-medium">
                      {truncateAddress(walletAddress)}
                    </code>
                    <button
                      onClick={copyAddress}
                      className="text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer"
                      title="Copy full address"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Balance */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Balance
                    </label>
                    <button
                      onClick={() => fetchBalance(walletAddress, false)}
                      disabled={isRefreshing}
                      className="text-cyan-400/70 hover:text-cyan-300 text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                  <div className="card-inset rounded-lg px-3 py-2.5">
                    <span className={`text-[14px] font-bold ${isUnfunded ? 'text-amber-400' : 'text-white'}`}>
                      {balance}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1.5 font-medium">XLM</span>
                    {isUnfunded && (
                      <span className="text-[10px] text-amber-400/70 ml-2 font-medium">Unfunded</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Actions Section ── */}
          <section className="card-panel rounded-xl p-5 space-y-4 animate-fade-in delay-200">
            <div>
              <h2 className="text-[13px] font-semibold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Actions
              </h2>
              <p className="text-[12px] text-slate-500 mt-1">
                Fund your account and send a test payment on the Stellar Testnet.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Claim */}
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
                  disabled={!walletAddress || isClaiming || isTransacting}
                  className="btn-primary w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isClaiming ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Claiming…
                    </>
                  ) : (
                    <>
                      <Droplet className="w-3.5 h-3.5" />
                      Claim 10,000 XLM
                    </>
                  )}
                </button>
              </div>

              {/* Send */}
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
                  disabled={!walletAddress || isClaiming || isTransacting || isUnfunded}
                  className="btn-ghost w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isTransacting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-cyan-400" />
                      Send 10 XLM
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* ── Activity Feed ── */}
          <section className="console-wrap animate-fade-in delay-300">
            <div className="console-header">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                Activity Feed
              </span>
              {logs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="text-[10px] text-slate-600 hover:text-slate-300 font-mono transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            <div className="console-body font-mono text-[11px] leading-relaxed space-y-1.5">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic">
                  Waiting for activity… connect your wallet to get started.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <span className="text-slate-700 shrink-0 select-none">[{log.timestamp}]</span>
                    <span
                      className={`
                        font-semibold uppercase text-[9px] px-1.5 py-0.5 rounded shrink-0
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
              <div ref={logsEndRef} />
            </div>

            {/* Result alerts */}
            {(lastTxHash || lastError) && (
              <div className="p-4 border-t border-cyan-500/8 space-y-3">
                {lastTxHash && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/15 text-teal-200">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[12px] text-white block">Transaction Confirmed</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Payment successfully sent on Stellar Testnet.
                        </p>
                      </div>
                    </div>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/15 text-[11px] transition cursor-pointer whitespace-nowrap"
                    >
                      View on Explorer
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {lastError && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/5 border border-red-500/12 text-red-200">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-[12px] text-white block">Error</span>
                      <p className="text-[11px] text-red-400/80 font-mono break-all whitespace-pre-wrap mt-0.5">
                        {lastError}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

        </div>

        {/* ─── Footer ─── */}
        <div className="px-6 py-3.5 border-t border-cyan-500/6 flex items-center justify-center">
          <span className="text-[10px] text-slate-600 tracking-wide">
            Built on Stellar · Testnet only · Not for real funds
          </span>
        </div>
      </div>
    </div>
  );
}
