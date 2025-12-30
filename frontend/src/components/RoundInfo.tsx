'use client';

import { Clock, Users, Coins, Shield, Play } from 'lucide-react';
import { formatTimeRemaining, formatEth } from '@/lib/utils';
import type { RoundData } from '@/hooks/useLottery';

interface RoundInfoProps {
  round: RoundData | null;
  timeRemaining: number;
  onSettleRound?: () => Promise<boolean>;
  onCancelRound?: () => Promise<boolean>;
  isSettling?: boolean;
}

export function RoundInfo({ round, timeRemaining, onSettleRound, onCancelRound, isSettling }: RoundInfoProps) {
  if (!round) {
    return (
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-dark-700 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-dark-700 rounded w-full" />
          <div className="h-4 bg-dark-700 rounded w-2/3" />
        </div>
      </div>
    );
  }

  // RoundStatus enum: 0=Active, 1=PendingReveal, 2=Settled
  const isActive = round.status === 0 && timeRemaining > 0;
  const isPendingReveal = round.status === 1;
  const isSettled = round.status === 2;
  const isEnded = timeRemaining <= 0 && round.status === 0;

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">
            Round #{round.roundId.toString()}
          </h2>
          {isActive ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400">
              Active
            </span>
          ) : isPendingReveal ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
              Awaiting Reveal
            </span>
          ) : isSettled ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
              Settled
            </span>
          ) : isEnded ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">
              Ready to Settle
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-dark-600/50 text-dark-300">
              Unknown
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-dark-400">
          <Shield className="w-4 h-4" />
          <span className="text-xs">FHE Protected</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-dark-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Time Left</span>
          </div>
          <p className="text-xl font-mono font-bold text-white">
            {formatTimeRemaining(timeRemaining)}
          </p>
        </div>

        <div className="bg-dark-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-dark-400 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Participants</span>
          </div>
          <p className="text-xl font-mono font-bold text-white">
            {round.participantCount.toString()}
          </p>
        </div>

        <div className="bg-dark-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-dark-400 mb-1">
            <Coins className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Prize Pool</span>
          </div>
          <p className="text-xl font-mono font-bold text-primary-400">
            {formatEth(round.prizePool)} ETH
          </p>
        </div>

        <div className="bg-dark-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-dark-400 mb-1">
            <Shield className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Winning #</span>
          </div>
          <p className="text-xl font-mono font-bold encrypted-text">
            {isSettled ? '???' : '████████'}
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-dark-800/50 rounded-lg border border-dark-700">
        <p className="text-xs text-dark-400 text-center">
          The winning number is encrypted and hidden from all participants until reveal.
          All guesses and confidence levels remain private throughout the round.
        </p>
      </div>

      {/* Settle/Cancel Round Button - shown when round ended */}
      {isEnded && (onSettleRound || onCancelRound) && (
        <div className="mt-4">
          {Number(round.participantCount) >= 3 ? (
            <button
              onClick={onSettleRound}
              disabled={isSettling}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-dark-600 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              {isSettling ? 'Settling Round...' : 'Settle Round & Start New'}
            </button>
          ) : onCancelRound ? (
            <button
              onClick={onCancelRound}
              disabled={isSettling}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-dark-600 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              {isSettling ? 'Cancelling...' : `Cancel Round & Start New (${round.participantCount.toString()} participants)`}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
