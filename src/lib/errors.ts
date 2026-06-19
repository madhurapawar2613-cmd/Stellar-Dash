import type { AppError } from '../types';

export function classifyError(error: any): AppError {
  const message = error?.message || String(error);
  const lowercaseMessage = message.toLowerCase();

  if (
    lowercaseMessage.includes('not found') ||
    lowercaseMessage.includes('not installed') ||
    lowercaseMessage.includes('missing') ||
    lowercaseMessage.includes('install')
  ) {
    return {
      type: 'WALLET_NOT_FOUND',
      message: 'Wallet extension not installed. Please install Freighter or another supported wallet.',
    };
  }

  if (
    lowercaseMessage.includes('rejected') ||
    lowercaseMessage.includes('cancelled') ||
    error?.code === 4001 ||
    lowercaseMessage.includes('user cancel') ||
    lowercaseMessage.includes('declined')
  ) {
    return {
      type: 'USER_REJECTED',
      message: 'Transaction was rejected. You cancelled the signing request.',
    };
  }

  if (
    lowercaseMessage.includes('insufficient balance') ||
    lowercaseMessage.includes('underfunded') ||
    lowercaseMessage.includes('op_low_reserve') ||
    lowercaseMessage.includes('tx_insufficient_balance') ||
    lowercaseMessage.includes('low reserve')
  ) {
    return {
      type: 'INSUFFICIENT_BALANCE',
      message: 'Insufficient XLM balance. Request testnet funds from Friendbot first.',
    };
  }

  return {
    type: 'UNKNOWN',
    message: message || 'An unknown error occurred.',
  };
}
