export type TxStatus = 'idle' | 'building' | 'signing' | 'pending' | 'success' | 'failed';

export type ErrorType = 'WALLET_NOT_FOUND' | 'USER_REJECTED' | 'INSUFFICIENT_BALANCE' | 'UNKNOWN';

export interface AppError {
  type: ErrorType;
  message: string;
}

export interface ActivityEntry {
  user: string;
  action: string;
  timestamp: number;
}
