'use client';

import { Clock, Users, Coins, Shield, Play, Loader2, Calculator } from 'lucide-react';
import { formatTimeRemaining, formatEth } from '@/lib/utils';
import { RoundStatus, type RoundData } from '@/hooks/useLottery';

interface RoundInfoProps {
  round: RoundData | null;
  timeRemaining: number;
  onSettleRound?: () => Promise<boolean>;
  onCancelRound?: () => Promise<boolean>;
  onComputeScores?: (batchStart: number, batchSize: number) => Promise<boolean>;
  isSettling?: boolean;
}

export function RoundInfo({ round, timeRemaining, onSettleRound, onCancelRound, onComputeScores, isSettling }: RoundInfoProps) {
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

  const isActive = round.status === RoundStatus.Active && timeRemaining > 0;
  const isSettlingStatus = round.status === RoundStatus.Settling;
  const isCompleted = round.status === RoundStatus.Completed;
  const isCancelled = round.status === RoundStatus.Cancelled;
  const isEnded = timeRemaining <= 0 && round.status === RoundStatus.Active;
  
  const scoresRemaining = Number(round.participantCount) - Number(round.scoresComputedCount);
  const allScoresComputed = scoresRemaining === 0 && Number(round.participantCount) > 0;

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
          ) : isSettlingStatus ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
              {allScoresComputed ? 'Awaiting Reveal' : 'Computing Scores'}
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
              Completed
            </span>
          ) : isCancelled ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
              Cancelled
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
            {isCompleted ? '???' : '████████'}
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
              {isSettling ? 'Settling Round...' : 'Settle Round & Begin Scoring'}
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

      {/* Score computation button - shown during settling phase */}
      {isSettlingStatus && !allScoresComputed && onComputeScores && (
        <div className="mt-4 space-y-3">
          <div className="bg-dark-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-400">Scores Computed</span>
              <span className="text-white font-mono">
                {round.scoresComputedCount.toString()} / {round.participantCount.toString()}
              </span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2 mt-2">
              <div 
                className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(Number(round.scoresComputedCount) / Number(round.participantCount)) * 100}%` }}
              />
            </div>
          </div>
          
          <button
            onClick={() => onComputeScores(Number(round.scoresComputedCount), 10)}
            disabled={isSettling}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-dark-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {isSettling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Computing Encrypted Scores...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                Compute Next Batch (FHE)
              </>
            )}
          </button>
          
          <p className="text-xs text-dark-500 text-center">
            Scoring runs under encryption using FHE operations. 
            Each batch computes encrypted distances and conviction scores.
          </p>
        </div>
      )}

      {/* Ready for reveal */}
      {isSettlingStatus && allScoresComputed && (
        <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <Shield className="w-4 h-4" />
            <span className="font-medium">All Scores Computed</span>
          </div>
          <p className="text-sm text-green-400/80">
            Encrypted scoring complete. Winners have been determined under encryption.
            Awaiting off-chain decryption and final reveal transaction.
          </p>
        </div>
      )}
    </div>
  );
}
