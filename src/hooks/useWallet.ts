import { useState, useCallback } from 'react';
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';
import { horizonServer } from '../lib/stellar';

// Map of wallet IDs to human-readable names and simple emojis/SVG paths if icons aren't loaded.
const WALLET_METADATA: Record<string, { name: string; icon: string }> = {
  freighter: { name: 'Freighter', icon: '⚡' },
  lobstr: { name: 'Lobstr', icon: '🦞' },
  xbull: { name: 'xBull', icon: '🐂' },
  albedo: { name: 'Albedo', icon: '🌌' },
  rabet: { name: 'Rabet', icon: '🐰' },
  hana: { name: 'Hana', icon: '🌸' },
};

// Initialize StellarWalletsKit statically
StellarWalletsKit.init({
  network: Networks.TESTNET,
  selectedWalletId: 'freighter',
  modules: defaultModules(),
});

export function useWallet(addLog: (type: 'info' | 'success' | 'error', msg: string) => void) {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletId, setWalletId] = useState<string>('');
  const [walletName, setWalletName] = useState<string>('');
  const [walletIcon, setWalletIcon] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.00');
  const [isUnfunded, setIsUnfunded] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Fetch balance from Horizon testnet
  const fetchBalance = useCallback(async (address: string, silent = false) => {
    if (!address) return;
    if (!silent) setIsRefreshing(true);

    try {
      const account = await horizonServer.loadAccount(address);
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
  }, [addLog]);

  // Handle wallet connection trigger
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    addLog('info', 'Opening Wallet Selector modal…');

    try {
      const res = await StellarWalletsKit.authModal();
      const pubKey = typeof res === 'string' ? res : res.address;

      if (!pubKey) {
        throw new Error('Wallet connection was rejected or returned an empty address.');
      }

      const activeModule = StellarWalletsKit.selectedModule;
      const optionId = activeModule?.productId || 'freighter';
      const optionName = activeModule?.productName || 'Freighter';
      const optionIcon = activeModule?.productIcon || '⚡';

      const metadata = WALLET_METADATA[optionId.toLowerCase()] || {
        name: optionName,
        icon: optionIcon,
      };

      setWalletAddress(pubKey);
      setWalletId(optionId);
      setWalletName(metadata.name);
      setWalletIcon(metadata.icon);

      addLog('success', `Connected: ${metadata.name} (${pubKey.slice(0, 6)}…${pubKey.slice(-6)})`);
      await fetchBalance(pubKey, false);
    } catch (err: any) {
      const msg = err?.message || String(err);
      addLog('error', `Connection failed: ${msg}`);
    } finally {
      setIsConnecting(false);
    }
  }, [addLog, fetchBalance]);

  // Handle wallet disconnect
  const handleDisconnect = useCallback(async () => {
    if (walletAddress) {
      addLog('info', `Disconnecting from ${walletName}…`);
    }
    try {
      await StellarWalletsKit.disconnect();
    } catch (err) {
      console.error('Error during disconnect:', err);
    }
    setWalletAddress('');
    setWalletId('');
    setWalletName('');
    setWalletIcon('');
    setBalance('0.00');
    setIsUnfunded(false);
  }, [walletAddress, walletName, addLog]);

  // Helper to sign transactions using the kit
  const signTx = useCallback(async (xdr: string, address: string): Promise<string> => {
    addLog('info', 'Requesting wallet signature via StellarWalletsKit…');
    const result = await StellarWalletsKit.signTransaction(xdr, {
      networkPassphrase: 'Test SDF Network ; September 2015',
      address,
    });

    if (typeof result === 'string') {
      return result;
    }
    if (result && typeof result === 'object') {
      if ('signedTxXdr' in result && result.signedTxXdr) {
        return result.signedTxXdr;
      }
      if ('result' in result && typeof result.result === 'string') {
        return result.result;
      }
    }
    throw new Error('Transaction was not signed.');
  }, [addLog]);

  return {
    walletAddress,
    walletId,
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
  };
}
