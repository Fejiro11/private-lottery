'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, ENTRY_FEE } from '@/lib/constants';

export interface RoundData {
  roundId: bigint;
  startTime: bigint;
  endTime: bigint;
  prizePool: bigint;
  participantCount: bigint;
  status: number;
}

export interface RevealedEntry {
  player: string;
  guess: number;
  confidence: number;
  distance: number;
  convictionScore: bigint;
  calibrationError: bigint;
}

export interface Winners {
  winner1: string;
  winner2: string;
  winner3: string;
  payout1: bigint;
  payout2: bigint;
  payout3: bigint;
}

export function useLottery(signer: ethers.Signer | null) {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [currentRound, setCurrentRound] = useState<RoundData | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        status: Number(round.status),
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

  const getWinners = useCallback(async (roundId: bigint): Promise<Winners | null> => {
    if (!contract) return null;

    try {
      const winners = await contract.getRoundWinners(roundId);
      return {
        winner1: winners.winner1,
        winner2: winners.winner2,
        winner3: winners.winner3,
        payout1: winners.payout1,
        payout2: winners.payout2,
        payout3: winners.payout3,
      };
    } catch (err: any) {
      console.error('Error getting winners:', err);
      return null;
    }
  }, [contract]);

  const getRevealedEntries = useCallback(async (roundId: bigint): Promise<RevealedEntry[]> => {
    if (!contract) return [];

    try {
      const entries = await contract.getRevealedEntries(roundId);
      return entries.map((e: any) => ({
        player: e.player,
        guess: Number(e.guess),
        confidence: Number(e.confidence),
        distance: Number(e.distance),
        convictionScore: e.convictionScore,
        calibrationError: e.calibrationError,
      }));
    } catch (err: any) {
      console.error('Error getting revealed entries:', err);
      return [];
    }
  }, [contract]);

  useEffect(() => {
    fetchRoundData();
    const interval = setInterval(fetchRoundData, 10000);
    return () => clearInterval(interval);
  }, [fetchRoundData]);

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
    submitEntry,
    settleRound,
    cancelRound,
    checkEntry,
    fetchRoundData,
    getWinners,
    getRevealedEntries,
  };
}
