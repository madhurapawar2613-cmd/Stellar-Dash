import { useState } from 'react';
import type { TxStatus } from '../types';

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
