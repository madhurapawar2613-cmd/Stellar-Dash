import type { AppError } from '../types';

/**
 * Classifies any raw wallet/network error into one of the 3 Level 2 typed app errors:
 *
 * - `WALLET_NOT_FOUND`     → shown as amber banner when no wallet extension is detected
 * - `USER_REJECTED`        → shown as blue banner when user cancels the signing popup
 * - `INSUFFICIENT_BALANCE` → shown as red banner with a "Request Friendbot XLM" CTA
 * - `UNKNOWN`              → fallback red banner for any other unexpected errors
 *
 * All classified errors auto-dismiss from the UI after 8 seconds.
 */
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
