'use client';

import { useState } from 'react';
import { Trophy, Target, Scale, Eye, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { formatEth, formatAddress } from '@/lib/utils';
import type { PastRound, WinnerData } from '@/hooks/useLottery';

interface RevealPanelProps {
  pastRounds: PastRound[];
  isLoading: boolean;
}

const categoryIcons = {
  0: Trophy,  // Conviction
  1: Target,  // Accuracy
  2: Scale,   // Calibration
};

const categoryNames = {
  0: 'Conviction Weighted',
  1: 'Raw Accuracy',
  2: 'Best Calibration',
};

const categoryColors = {
  0: { text: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/30' },
  1: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  2: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
};

function WinnerCard({ winner, winningNumber }: { winner: WinnerData; winningNumber: number }) {
  const Icon = categoryIcons[winner.category as keyof typeof categoryIcons] || Trophy;
  const colors = categoryColors[winner.category as keyof typeof categoryColors] || categoryColors[0];
  const name = categoryNames[winner.category as keyof typeof categoryNames] || 'Unknown';

  const getWinnerNarrative = () => {
    switch (winner.category) {
      case 0:
        return `Submitted ${winner.guess} with ${winner.confidence}% confidence. Their conviction-weighted score of ${winner.score.toLocaleString()} combined accuracy with bold belief.`;
      case 1:
        return `Guessed ${winner.guess}, just ${winner.distance} away from ${winningNumber}. Pure precision rewarded regardless of confidence level.`;
      case 2:
        return `Their ${winner.confidence}% confidence closely matched their ${Math.round(((1023 - winner.distance) / 1023) * 100)}% accuracy. Calibrated self-assessment wins.`;
      default:
        return '';
    }
  };

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <div className={`${colors.text} mt-0.5`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`font-medium ${colors.text}`}>{name}</h4>
            <span className="text-sm font-mono text-primary-400">
              {formatEth(winner.prize)} ETH
            </span>
          </div>
          
          <a
            href={`https://sepolia.etherscan.io/address/${winner.addr}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-dark-400 hover:text-white transition-colors flex items-center gap-1 mt-1"
          >
            {formatAddress(winner.addr)}
            <ExternalLink className="w-3 h-3" />
          </a>
          
          <p className="text-sm text-dark-300 mt-2">
            {getWinnerNarrative()}
          </p>
          
          <div className="flex gap-4 mt-3 text-xs">
            <div>
              <span className="text-dark-500">Guess:</span>
              <span className="text-white ml-1 font-mono">{winner.guess}</span>
            </div>
            <div>
              <span className="text-dark-500">Confidence:</span>
              <span className="text-white ml-1 font-mono">{winner.confidence}%</span>
            </div>
            <div>
              <span className="text-dark-500">Distance:</span>
              <span className="text-white ml-1 font-mono">{winner.distance}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoundReveal({ round }: { round: PastRound }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-dark-700 rounded-xl overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-dark-900 hover:bg-dark-800 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary-400" />
            <span className="font-medium text-white">Round #{round.roundId.toString()}</span>
          </div>
          
          <div className="flex items-center gap-2 px-2 py-1 bg-dark-800 rounded">
            <span className="text-xs text-dark-400">Winning #:</span>
            <span className="text-sm font-mono font-bold text-primary-400">{round.winningNumber}</span>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 text-xs text-dark-400">
            <span>{round.participantCount.toString()} participants</span>
            <span>•</span>
            <span>{formatEth(round.prizePool)} ETH pool</span>
          </div>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-dark-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-dark-400" />
        )}
      </button>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 bg-dark-950 border-t border-dark-800 space-y-4">
          {/* Winning number highlight */}
          <div className="text-center py-4 bg-dark-900 rounded-lg border border-dark-700">
            <p className="text-xs text-dark-400 uppercase tracking-wide mb-1">The Winning Number Was</p>
            <p className="text-4xl font-mono font-bold text-primary-400">{round.winningNumber}</p>
            <p className="text-xs text-dark-500 mt-2">
              Generated via FHE random oracle and kept encrypted until this reveal
            </p>
          </div>
          
          {/* Winners */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary-400" />
              Winners
            </h4>
            
            {round.winners.map((winner, idx) => (
              <WinnerCard 
                key={idx} 
                winner={winner} 
                winningNumber={round.winningNumber} 
              />
            ))}
          </div>
          
          {/* Prize distribution */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-dark-900 rounded p-2">
              <p className="text-dark-400">Total Pool</p>
              <p className="font-mono text-white">{formatEth(round.prizePool)} ETH</p>
            </div>
            <div className="bg-dark-900 rounded p-2">
              <p className="text-dark-400">Distributed</p>
              <p className="font-mono text-white">
                {formatEth(
                  round.winners.reduce((sum, w) => sum + w.prize, BigInt(0))
                )} ETH
              </p>
            </div>
            <div className="bg-dark-900 rounded p-2">
              <p className="text-dark-400">Protocol Fee</p>
              <p className="font-mono text-white">
                {formatEth(round.prizePool / BigInt(100))} ETH
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RevealPanel({ pastRounds, isLoading }: RevealPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-dark-700 rounded w-1/3" />
          <div className="h-20 bg-dark-700 rounded" />
          <div className="h-20 bg-dark-700 rounded" />
        </div>
      </div>
    );
  }

  if (pastRounds.length === 0) {
    return (
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">Past Reveals</h2>
        </div>
        <div className="text-center py-8">
          <Eye className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No completed rounds yet</p>
          <p className="text-sm text-dark-500 mt-1">
            Past round results will appear here after settlement
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">Past Reveals</h2>
        </div>
        <span className="text-xs text-dark-400">{pastRounds.length} completed rounds</span>
      </div>

      <div className="space-y-3">
        {pastRounds.map((round) => (
          <RoundReveal key={round.roundId.toString()} round={round} />
        ))}
      </div>

      <p className="text-xs text-dark-500 text-center mt-4">
        All values were encrypted until the reveal phase. 
        Winners were determined by on-chain FHE computations.
      </p>
    </div>
  );
}

