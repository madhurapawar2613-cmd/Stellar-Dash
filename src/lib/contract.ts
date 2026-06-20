import { Contract, TransactionBuilder, Networks, Account, scValToNative, nativeToScVal, Keypair } from '@stellar/stellar-sdk';
import { rpc } from './stellar';

export async function callContractView(
  contractId: string,
  method: string,
  args: any[] = []
): Promise<any> {
  const dummyAddress = Keypair.random().publicKey();
  const sourceAccount = new Account(dummyAddress, '0');
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);

  // Check if simulation was successful
  if (simResult && 'result' in simResult && simResult.result && simResult.result.retval) {
    return scValToNative(simResult.result.retval);
  }

  throw new Error(`Simulation failed for method ${method}: ${JSON.stringify(simResult)}`);
}

export function buildLogActivityOperation(
  contractId: string,
  userAddress: string,
  action: string,
  timestamp: number
) {
  const contract = new Contract(contractId);
  return contract.call(
    'log_activity',
    nativeToScVal(userAddress, { type: 'address' }),
    nativeToScVal(action, { type: 'string' }),
    nativeToScVal(BigInt(timestamp), { type: 'u64' })
  );
}

export interface RawActivityEntry {
  user: any;
  action: any;
  timestamp: any;
}

export function parseActivityEntry(raw: RawActivityEntry) {
  const user = raw.user && typeof raw.user === 'object' && 'toString' in raw.user
    ? raw.user.toString()
    : String(raw.user);

  const action = raw.action && typeof raw.action === 'object' && 'toString' in raw.action
    ? raw.action.toString()
    : String(raw.action);

  let timestamp = 0;
  if (raw.timestamp !== undefined && raw.timestamp !== null) {
    try {
      timestamp = Number(raw.timestamp.toString());
    } catch (e) {
      timestamp = Math.floor(Date.now() / 1000);
    }
  }

  return {
    user,
    action,
    timestamp,
  };
}
export async function getAllLogs(contractId: string): Promise<any[]> {
  try {
    const rawLogs = await callContractView(contractId, 'get_all_logs', []);
    if (Array.isArray(rawLogs)) {
      return rawLogs.map((log: any) => parseActivityEntry(log));
    }
    return [];
  } catch (error) {
    console.error('Error fetching all logs:', error);
    return [];
  }
}
