import { useCallback } from 'react';
import { TransactionBuilder, Networks } from '@stellar/stellar-sdk';
import { rpc } from '../lib/stellar';
import { buildLogActivityOperation } from '../lib/contract';

interface StatusUpdaters {
  setBuilding: () => void;
  setSigning: () => void;
  setPending: () => void;
  setSuccess: (hash: string) => void;
  setFailed: (err: string) => void;
  reset: () => void;
}

export function useContract(
  contractId: string,
  walletAddress: string,
  signTx: (xdr: string, address: string) => Promise<string>,
  updateStatus: StatusUpdaters,
  addLog: (type: 'info' | 'success' | 'error', msg: string) => void
) {
  const logActivity = useCallback(async (action: string) => {
    if (!walletAddress) {
      throw new Error('Wallet not connected.');
    }
    if (!contractId || contractId === 'your_deployed_contract_address_here') {
      throw new Error('Contract address not configured in environment variables.');
    }

    updateStatus.setBuilding();
    addLog('info', `Building transaction for logging on-chain activity "${action}"…`);

    try {
      // 1. Load account sequence from RPC
      const account = await rpc.getAccount(walletAddress);
      
      // 2. Build base transaction
      const op = buildLogActivityOperation(
        contractId,
        walletAddress,
        action,
        Math.floor(Date.now() / 1000)
      );

      const tx = new TransactionBuilder(account, {
        fee: '100', // starting fee, prepareTransaction will compute actual fees
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(op)
        .setTimeout(60)
        .build();

      // 3. Simulate & prepare transaction (attaches footprint metadata and calculates Soroban resources)
      addLog('info', 'Simulating transaction to construct ledger footprint…');
      const preparedTx = await rpc.prepareTransaction(tx);

      // 4. Request wallet signature
      updateStatus.setSigning();
      const signedXdr = await signTx(preparedTx.toXDR(), walletAddress);

      // 5. Submit transaction
      updateStatus.setPending();
      addLog('info', 'Broadcasting transaction to network…');
      const submitResp = await rpc.sendTransaction(TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET));

      let txStatus: string = submitResp.status;
      const txHash = submitResp.hash;

      // 6. Poll for completion
      let retries = 15;
      while (txStatus === 'PENDING' && retries > 0) {
        addLog('info', `Transaction pending, checking status… (retries left: ${retries})`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const statusResp = await rpc.getTransaction(txHash);
        txStatus = statusResp.status;
        retries--;
      }

      if (txStatus === 'SUCCESS') {
        updateStatus.setSuccess(txHash);
        addLog('success', `On-chain activity logged successfully! Hash: ${txHash.slice(0, 12)}…`);
        return txHash;
      } else {
        throw new Error(`Transaction failed or timed out with status: ${txStatus}`);
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      updateStatus.setFailed(errMsg);
      addLog('error', `On-chain activity logging failed: ${errMsg}`);
      throw err;
    }
  }, [contractId, walletAddress, signTx, updateStatus, addLog]);

  return {
    logActivity,
  };
}
