import { useState } from 'react';
import type { TxStatus } from '../types';

/**
 * useTransactionStatus — Level 2 transaction lifecycle tracker
 *
 * Tracks a Stellar transaction through all 6 states:
 *   idle     → no active transaction
 *   building → constructing transaction + fetching sequence/footprint
 *   signing  → waiting for user to approve in wallet popup
 *   pending  → transaction submitted to Soroban RPC / Horizon, awaiting ledger close
 *   success  → transaction confirmed on-chain (txHash is set)
 *   failed   → transaction rejected or timed out (errorMsg is set)
 */
export function useTransactionStatus() {
  const [status, setStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');


  const setBuilding = () => {
    setStatus('building');
    setTxHash('');
    setErrorMsg('');
  };

  const setSigning = () => {
    setStatus('signing');
  };

  const setPending = () => {
    setStatus('pending');
  };

  const setSuccess = (hash: string) => {
    setStatus('success');
    setTxHash(hash);
  };

  const setFailed = (err: string) => {
    setStatus('failed');
    setErrorMsg(err);
  };

  const reset = () => {
    setStatus('idle');
    setTxHash('');
    setErrorMsg('');
  };

  return {
    status,
    txHash,
    errorMsg,
    setBuilding,
    setSigning,
    setPending,
    setSuccess,
    setFailed,
    reset,
  };
}
