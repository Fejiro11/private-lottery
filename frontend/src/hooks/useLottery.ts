'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, ENTRY_FEE } from '@/lib/constants';

// RoundStatus enum matching contract
export enum RoundStatus {
  Active = 0,
  Settling = 1,
  Completed = 2,
  Cancelled = 3
}

export interface RoundData {
  roundId: bigint;
  startTime: bigint;
  endTime: bigint;
  prizePool: bigint;
  participantCount: bigint;
  scoresComputedCount: bigint;
  status: RoundStatus;
}

export interface WinnerData {
  addr: string;
  category: number;
  prize: bigint;
  guess: number;
  confidence: number;
  distance: number;
  score: number;
}

export interface PastRound {
  roundId: bigint;
  winningNumber: number;
  winners: WinnerData[];
  prizePool: bigint;
  participantCount: bigint;
}

export function useLottery(signer: ethers.Signer | null) {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [currentRound, setCurrentRound] = useState<RoundData | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastRounds, setPastRounds] = useState<PastRound[]>([]);

  useEffect(() => {
    if (signer && CONTRACT_ADDRESS) {
      const lotteryContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(lotteryContract);
    }
  }, [signer]);

  const fetchRoundData = useCallback(async () => {
    if (!contract) return;

    try {
      const round = await contract.getCurrentRound();
      setCurrentRound({
        roundId: round.roundId,
        startTime: round.startTime,
        endTime: round.endTime,
        prizePool: round.prizePool,
        participantCount: round.participantCount,
        scoresComputedCount: round.scoresComputedCount,
        status: Number(round.status) as RoundStatus,
      });

      // Calculate time remaining from endTime
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, Number(round.endTime) - now);
      setTimeRemaining(remaining);
    } catch (err: any) {
      console.error('Error fetching round data:', err);
    }
  }, [contract]);

  const checkEntry = useCallback(async (address: string) => {
    if (!contract || !address) return;

    try {
      const roundId = await contract.currentRoundId();
      const entered = await contract.hasParticipated(roundId, address);
      setHasEntered(entered);
    } catch (err: any) {
      console.error('Error checking entry:', err);
    }
  }, [contract]);

  const submitEntry = useCallback(async (
    encryptedGuess: string,
    encryptedConfidence: string,
    inputProof: string
  ) => {
    if (!contract) {
      setError('Contract not initialized');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tx = await contract.submitPrediction(
        encryptedGuess,
        encryptedConfidence,
        inputProof,
        { value: ethers.parseEther(ENTRY_FEE) }
      );
      await tx.wait();
      setHasEntered(true);
      await fetchRoundData();
      return true;
    } catch (err: any) {
      console.error('Error submitting entry:', err);
      setError(err.reason || err.message || 'Failed to submit entry');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, fetchRoundData]);

  const settleRound = useCallback(async () => {
    if (!contract) return false;

    setIsLoading(true);
    try {
      const tx = await contract.settleRound();
      await tx.wait();
      await fetchRoundData();
      return true;
    } catch (err: any) {
      console.error('Error settling round:', err);
      setError(err.reason || err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, fetchRoundData]);

  const cancelRound = useCallback(async () => {
    if (!contract) return false;

    setIsLoading(true);
    try {
      const tx = await contract.cancelRound();
      await tx.wait();
      await fetchRoundData();
      return true;
    } catch (err: any) {
      console.error('Error cancelling round:', err);
      setError(err.reason || err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, fetchRoundData]);

  const computeScoresBatch = useCallback(async (batchStart: number, batchSize: number) => {
    if (!contract) return false;

    setIsLoading(true);
    try {
      const tx = await contract.computeScoresBatch(batchStart, batchSize);
      await tx.wait();
      await fetchRoundData();
      return true;
    } catch (err: any) {
      console.error('Error computing scores:', err);
      setError(err.reason || err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, fetchRoundData]);

  const getWinners = useCallback(async (roundId: bigint): Promise<WinnerData[] | null> => {
    if (!contract) return null;

    try {
      const winners = await contract.getRoundWinners(roundId);
      return winners.map((w: any) => ({
        addr: w.addr,
        category: Number(w.category),
        prize: w.prize,
        guess: Number(w.guess),
        confidence: Number(w.confidence),
        distance: Number(w.distance),
        score: Number(w.score),
      }));
    } catch (err: any) {
      console.error('Error getting winners:', err);
      return null;
    }
  }, [contract]);

  const fetchPastRounds = useCallback(async (count: number = 5) => {
    if (!contract) return;

    try {
      const currentId = await contract.currentRoundId();
      const rounds: PastRound[] = [];
      
      for (let i = Number(currentId) - 1; i >= 1 && rounds.length < count; i--) {
        try {
          const roundData = await contract.rounds(i);
          if (roundData.isSettled) {
            const winners = await contract.getRoundWinners(i);
            rounds.push({
              roundId: BigInt(i),
              winningNumber: Number(roundData.revealedWinningNumber),
              winners: winners.map((w: any) => ({
                addr: w.addr,
                category: Number(w.category),
                prize: w.prize,
                guess: Number(w.guess),
                confidence: Number(w.confidence),
                distance: Number(w.distance),
                score: Number(w.score),
              })),
              prizePool: roundData.prizePool,
              participantCount: roundData.participantCount,
            });
          }
        } catch {
          // Skip rounds that fail to load
        }
      }
      
      setPastRounds(rounds);
    } catch (err: any) {
      console.error('Error fetching past rounds:', err);
    }
  }, [contract]);

  useEffect(() => {
    fetchRoundData();
    fetchPastRounds();
    const interval = setInterval(fetchRoundData, 10000);
    return () => clearInterval(interval);
  }, [fetchRoundData, fetchPastRounds]);

  useEffect(() => {
    if (timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  return {
    contract,
    currentRound,
    hasEntered,
    timeRemaining,
    isLoading,
    error,
    pastRounds,
    submitEntry,
    settleRound,
    cancelRound,
    computeScoresBatch,
    checkEntry,
    fetchRoundData,
    getWinners,
    fetchPastRounds,
  };
}
