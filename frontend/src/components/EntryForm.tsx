'use client';

import { useState } from 'react';
import { Lock, AlertCircle, Send, Info } from 'lucide-react';
import { ENTRY_FEE, MAX_GUESS, MAX_CONFIDENCE } from '@/lib/constants';

interface EntryFormProps {
  isConnected: boolean;
  hasEntered: boolean;
  isLoading: boolean;
  timeRemaining: number;
  onSubmit: (guess: number, confidence: number) => Promise<boolean>;
}

export function EntryForm({
  isConnected,
  hasEntered,
  isLoading,
  timeRemaining,
  onSubmit,
}: EntryFormProps) {
  const [guess, setGuess] = useState(500);
  const [confidence, setConfidence] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || hasEntered || timeRemaining <= 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await onSubmit(guess, confidence);
      if (!success) {
        setError('Failed to submit entry. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = !isConnected || hasEntered || timeRemaining <= 0 || isLoading || isSubmitting;

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
          <Lock className="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Submit Your Prediction</h2>
          <p className="text-sm text-dark-400">Your guess will be encrypted before submission</p>
        </div>
      </div>

      {hasEntered ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-green-400">
            <Lock className="w-4 h-4" />
            <span className="font-medium">Entry Submitted</span>
          </div>
          <p className="text-sm text-green-400/80 mt-1">
            Your encrypted prediction is locked in. Results will be revealed after the round ends.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-white">
              Your Guess (0 - {MAX_GUESS})
            </label>
            <span className="text-lg font-mono font-bold text-primary-400">{guess}</span>
          </div>
          <input
            type="range"
            min={0}
            max={MAX_GUESS}
            value={guess}
            onChange={(e) => setGuess(Number(e.target.value))}
            disabled={isDisabled}
            className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-dark-500 mt-1">
            <span>0</span>
            <span>{MAX_GUESS}</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-white">
                Confidence Level (0 - {MAX_CONFIDENCE}%)
              </label>
              <div className="group relative">
                <Info className="w-4 h-4 text-dark-500 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-dark-800 rounded-lg text-xs text-dark-300 w-64 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-dark-600 z-10">
                  Higher confidence amplifies your score if correct, but penalizes you more if wrong. 
                  Calibration rewards matching confidence to actual accuracy.
                </div>
              </div>
            </div>
            <span className="text-lg font-mono font-bold text-primary-400">{confidence}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={MAX_CONFIDENCE}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            disabled={isDisabled}
            className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-dark-500 mt-1">
            <span>Cautious</span>
            <span>Very Confident</span>
          </div>
        </div>

        <div className="bg-dark-800 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-dark-400">Entry Fee</span>
            <span className="text-white font-medium">{ENTRY_FEE} ETH</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-dark-400">Your Guess</span>
            <span className="text-white font-mono encrypted-text">████</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-dark-400">Your Confidence</span>
            <span className="text-white font-mono encrypted-text">██%</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isDisabled}
          className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-400 text-dark-950 font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:bg-dark-600 disabled:text-dark-400 disabled:cursor-not-allowed glow-primary-hover"
        >
          {isSubmitting || isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
              Encrypting & Submitting...
            </>
          ) : hasEntered ? (
            <>
              <Lock className="w-4 h-4" />
              Entry Locked
            </>
          ) : timeRemaining <= 0 ? (
            'Round Ended'
          ) : !isConnected ? (
            'Connect Wallet to Enter'
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Encrypted Entry
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-dark-500 text-center mt-4">
        Your prediction will be encrypted using Fully Homomorphic Encryption before being sent on-chain.
        No one, including validators, can see your guess until reveal.
      </p>
    </div>
  );
}
