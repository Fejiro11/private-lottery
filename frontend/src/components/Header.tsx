'use client';

import { Lock, Wallet, ExternalLink } from 'lucide-react';
import { formatAddress } from '@/lib/utils';

interface HeaderProps {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isWrongNetwork: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function Header({
  address,
  isConnected,
  isConnecting,
  isWrongNetwork,
  onConnect,
  onDisconnect,
}: HeaderProps) {
  return (
    <header className="border-b border-dark-800 bg-dark-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <Lock className="w-5 h-5 text-dark-950" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Private Lottery</h1>
            <p className="text-xs text-dark-400">FHE-Powered Predictions</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://sepolia.etherscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-dark-400 hover:text-white transition-colors flex items-center gap-1 text-sm"
          >
            Sepolia <ExternalLink className="w-3 h-3" />
          </a>

          {isConnected ? (
            <div className="flex items-center gap-3">
              {isWrongNetwork && (
                <span className="text-red-400 text-sm">Wrong Network</span>
              )}
              <button
                onClick={onDisconnect}
                className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 px-4 py-2 rounded-lg transition-colors"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium">{formatAddress(address || '')}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-dark-950 font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
