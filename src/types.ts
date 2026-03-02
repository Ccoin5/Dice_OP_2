export interface WalletState {
  address: string | null;
  connected: boolean;
  network: string | null;
  balance: number;
  walletType: 'unisat' | 'opwallet' | null;
}

export interface Bet {
  id: string;
  timestamp: number;
  amount: number;
  prediction: number;
  result: number;
  win: boolean;
  txid?: string;
}
