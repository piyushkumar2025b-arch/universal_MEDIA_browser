/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Wallet, 
  Check, 
  Copy, 
  ExternalLink, 
  AlertCircle, 
  LogOut, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Loader2,
  Info
} from 'lucide-react';
import { useWeb3Wallet } from '../services/web3Wallet';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  favoritesCount?: number;
  collectionsCount?: number;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  favoritesCount = 0,
  collectionsCount = 0,
}) => {
  const {
    address,
    networkName,
    isConnected,
    isConnecting,
    hasMetaMask,
    error,
    connect,
    disconnect,
    clearError,
  } = useWeb3Wallet();

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = async () => {
    clearError();
    await connect();
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden transition-all transform animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Web3 &amp; MetaMask Wallet</h2>
              <p className="text-xs text-neutral-500">Decentralized asset identity &amp; manifest signing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Error Banner */}
          {error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold">MetaMask Notice:</span>
                  <p className="mt-0.5 leading-relaxed">{error}</p>
                </div>
                <button 
                  onClick={clearError}
                  className="text-neutral-400 hover:text-neutral-600"
                  title="Dismiss error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-amber-700/80 bg-amber-100/60 rounded-md p-2">
                Tip: If your browser extension is running inside a preview iframe, permissions may be restricted. URMIL works fully with local and cloud storage without requiring a wallet.
              </p>
            </div>
          )}

          {isConnected && address ? (
            /* Connected State */
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-semibold text-emerald-800">Connected to MetaMask</span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    {networkName}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-lg bg-white border border-emerald-100 px-3 py-2">
                  <div className="font-mono text-xs font-semibold text-neutral-800">
                    {formatAddress(address)}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-medium text-[11px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span className="text-[11px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats & Capabilities */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
                  <div className="text-neutral-500 font-medium">Favorite Media</div>
                  <div className="text-lg font-bold text-neutral-800 mt-0.5">{favoritesCount} items</div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
                  <div className="text-neutral-500 font-medium">Collections</div>
                  <div className="text-lg font-bold text-neutral-800 mt-0.5">{collectionsCount} sets</div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 p-3.5 text-xs text-neutral-600 space-y-1.5">
                <div className="flex items-center gap-1.5 font-medium text-neutral-800">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  <span>Decentralized Ownership Ready</span>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-500">
                  Your wallet address can be attached to exported JSON manifests for collections and search archives in My Library.
                </p>
              </div>

              <button
                onClick={disconnect}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 text-neutral-500" />
                <span>Disconnect Wallet</span>
              </button>
            </div>
          ) : (
            /* Disconnected / Connect State */
            <div className="space-y-4">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 text-xs text-neutral-600 space-y-2">
                <div className="flex items-center gap-2 font-medium text-neutral-900">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Connect Web3 / MetaMask</span>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-500">
                  Link your Ethereum or EVM wallet to authenticate ownership of exported research collections, verify public domain archives, or sign decentralized media bundles.
                </p>
              </div>

              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-300" />
                    <span>Connecting to MetaMask...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 text-amber-400" />
                    <span>Connect with MetaMask</span>
                  </>
                )}
              </button>

              {!hasMetaMask && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Info className="h-3.5 w-3.5 text-blue-600" />
                    <span>MetaMask Not Detected</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-blue-700/80">
                    To use Web3 features, install the MetaMask extension from your browser's store. All standard search and download features work without a wallet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-3 flex items-center justify-between text-[11px] text-neutral-500">
          <span>URMIL Web3 Shield Active</span>
          <button
            onClick={onClose}
            className="font-medium text-neutral-700 hover:text-neutral-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
