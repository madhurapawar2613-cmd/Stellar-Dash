import { rpc as StellarRpc, Horizon } from '@stellar/stellar-sdk';

const RPC_URL = import.meta.env.VITE_SOROBAN_RPC || 'https://soroban-testnet.stellar.org';
const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';

export const rpc = new StellarRpc.Server(RPC_URL);
export const horizonServer = new Horizon.Server(HORIZON_URL);
