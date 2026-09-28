/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';

export interface Web3WalletState {
  address: string | null;
  chainId: string | null;
  networkName: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  hasMetaMask: boolean;
  error: string | null;
}

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

const WALLET_STORAGE_KEY = 'urmil_web3_wallet_address';

function parseNetwork(chainId: string | null): string {
  if (!chainId) return 'Unknown Network';
  const dec = parseInt(chainId, 16);
  switch (dec) {
    case 1:
      return 'Ethereum Mainnet';
    case 11155111:
      return 'Sepolia Testnet';
    case 137:
      return 'Polygon Mainnet';
    case 8453:
      return 'Base Mainnet';
    case 42161:
      return 'Arbitrum One';
    case 10:
      return 'Optimism Mainnet';
    default:
      return `Chain ID ${dec || chainId}`;
  }
}

type WalletListener = (state: Web3WalletState) => void;

class Web3WalletService {
  private static instance: Web3WalletService;
  private state: Web3WalletState = {
    address: null,
    chainId: null,
    networkName: null,
    isConnected: false,
    isConnecting: false,
    hasMetaMask: false,
    error: null,
  };
  private listeners: Set<WalletListener> = new Set();
  private initialized = false;

  public static getInstance(): Web3WalletService {
    if (!Web3WalletService.instance) {
      Web3WalletService.instance = new Web3WalletService();
    }
    return Web3WalletService.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    const hasMetaMask = Boolean(typeof window !== 'undefined' && window.ethereum);
    this.state.hasMetaMask = hasMetaMask;

    // Check previously stored address
    try {
      const stored = localStorage.getItem(WALLET_STORAGE_KEY);
      if (stored && /^0x[a-fA-F0-9]{40}$/.test(stored)) {
        this.state.address = stored;
        this.state.isConnected = true;
      }
    } catch {}

    if (hasMetaMask && window.ethereum?.on) {
      try {
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
          if (!accounts || accounts.length === 0) {
            this.disconnect();
          } else {
            const newAddr = accounts[0];
            this.state.address = newAddr;
            this.state.isConnected = true;
            try {
              localStorage.setItem(WALLET_STORAGE_KEY, newAddr);
            } catch {}
            this.notify();
          }
        });

        window.ethereum.on('chainChanged', (chainId: string) => {
          this.state.chainId = chainId;
          this.state.networkName = parseNetwork(chainId);
          this.notify();
        });
      } catch (e) {
        console.debug('[Web3Wallet] Provider event binding safely skipped:', e);
      }
    }
  }

  public getState(): Web3WalletState {
    return { ...this.state };
  }

  public subscribe(listener: WalletListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const current = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('[Web3Wallet] Listener error:', err);
      }
    });
  }

  public async connect(): Promise<{ success: boolean; address?: string; error?: string }> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Window environment not available.' };
    }

    if (!window.ethereum) {
      const err = 'MetaMask is not installed or not detected in this browser.';
      this.state.error = err;
      this.state.isConnecting = false;
      this.notify();
      return { success: false, error: err };
    }

    this.state.isConnecting = true;
    this.state.error = null;
    this.notify();

    try {
      // Gracefully request accounts without throwing uncaught exceptions
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts selected in MetaMask.');
      }

      const address = accounts[0];
      let chainId: string | null = null;
      try {
        chainId = await window.ethereum.request({ method: 'eth_chainId' });
      } catch {}

      this.state.address = address;
      this.state.chainId = chainId;
      this.state.networkName = parseNetwork(chainId);
      this.state.isConnected = true;
      this.state.isConnecting = false;
      this.state.error = null;

      try {
        localStorage.setItem(WALLET_STORAGE_KEY, address);
      } catch {}

      this.notify();
      return { success: true, address };
    } catch (err: any) {
      let friendlyMessage = 'Failed to connect to MetaMask.';
      
      if (err?.code === 4001) {
        friendlyMessage = 'MetaMask connection was cancelled by user.';
      } else if (err?.code === -32002) {
        friendlyMessage = 'MetaMask connection request is already pending. Please open your MetaMask extension.';
      } else if (err?.message?.includes('sandboxed') || err?.message?.includes('Failed to connect to MetaMask')) {
        friendlyMessage = 'MetaMask extension connection is restricted in this sandboxed preview iframe.';
      } else if (err?.message) {
        friendlyMessage = err.message;
      }

      this.state.isConnecting = false;
      this.state.error = friendlyMessage;
      this.notify();
      return { success: false, error: friendlyMessage };
    }
  }

  public disconnect(): void {
    this.state.address = null;
    this.state.chainId = null;
    this.state.networkName = null;
    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.error = null;
    try {
      localStorage.removeItem(WALLET_STORAGE_KEY);
    } catch {}
    this.notify();
  }

  public clearError(): void {
    this.state.error = null;
    this.notify();
  }

  public exportCollectionManifest(collectionName: string, items: any[]): string {
    const manifest = {
      standard: 'URMIL_COLLECTION_METADATA_V1',
      name: collectionName,
      description: `Decentralized media collection generated with URMIL Universal Media Browser`,
      ownerAddress: this.state.address || '0x0000000000000000000000000000000000000000',
      network: this.state.networkName || 'Decentralized Web',
      itemCount: items.length,
      createdAt: new Date().toISOString(),
      items: items.map((item, index) => ({
        index,
        id: item.id,
        title: item.title,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        category: item.category,
        license: item.license,
        source: item.source?.name || item.source?.providerId || 'Unknown'
      }))
    };
    return JSON.stringify(manifest, null, 2);
  }
}

export const web3Wallet = Web3WalletService.getInstance();

export function useWeb3Wallet() {
  const [walletState, setWalletState] = useState<Web3WalletState>(() => web3Wallet.getState());

  useEffect(() => {
    return web3Wallet.subscribe((nextState) => {
      setWalletState(nextState);
    });
  }, []);

  const connect = useCallback(() => web3Wallet.connect(), []);
  const disconnect = useCallback(() => web3Wallet.disconnect(), []);
  const clearError = useCallback(() => web3Wallet.clearError(), []);
  const exportManifest = useCallback((name: string, items: any[]) => {
    return web3Wallet.exportCollectionManifest(name, items);
  }, []);

  return {
    ...walletState,
    connect,
    disconnect,
    clearError,
    exportManifest,
  };
}
