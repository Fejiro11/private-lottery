'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { RoundInfo } from '@/components/RoundInfo';
import { EntryForm } from '@/components/EntryForm';
import { WinnerCategories } from '@/components/WinnerCategories';
import { useWallet } from '@/hooks/useWallet';
import { useLottery } from '@/hooks/useLottery';
import { initializeFhevm, encryptPrediction } from '@/lib/fhevm';
import { CONTRACT_ADDRESS } from '@/lib/constants';
import { HelpCircle, Shield, Zap, Eye } from 'lucide-react';

export default function Home() {
  const wallet = useWallet();
  const lottery = useLottery(wallet.signer);
  const [fhevmReady, setFhevmReady] = useState(false);
  const [encryptionError, setEncryptionError] = useState<string | null>(null);

  // Initialize FHEVM on mount
  useEffect(() => {
    initializeFhevm()
      .then(() => setFhevmReady(true))
      .catch((err) => {
        console.error('FHEVM initialization failed:', err);
        setEncryptionError('Failed to initialize encryption library');
      });
  }, []);

  useEffect(() => {
    if (wallet.address) {
      lottery.checkEntry(wallet.address);
    }
  }, [wallet.address, lottery.checkEntry]);

  // Auto-settle or auto-cancel expired rounds
  const [isAutoSettling, setIsAutoSettling] = useState(false);
  useEffect(() => {
    const round = lottery.currentRound;
    if (!round || !wallet.signer || isAutoSettling) return;

    // Check if round has ended (status=0 Active, time expired)
    const isEnded = round.status === 0 && lottery.timeRemaining <= 0;
    if (!isEnded) return;

    const participantCount = Number(round.participantCount);
    
    if (participantCount >= 3) {
      // Auto-settle with enough participants
      console.log('Auto-settling expired round...');
      setIsAutoSettling(true);
      lottery.settleRound()
        .then((success) => {
          if (success) console.log('Round settled successfully');
        })
        .finally(() => setIsAutoSettling(false));
    } else if (participantCount < 3) {
      // Auto-cancel with insufficient participants
      console.log('Auto-cancelling expired round (insufficient participants)...');
      setIsAutoSettling(true);
      lottery.cancelRound()
        .then((success) => {
          if (success) console.log('Round cancelled, new round started');
        })
        .finally(() => setIsAutoSettling(false));
    }
  }, [lottery.currentRound, lottery.timeRemaining, wallet.signer, isAutoSettling, lottery.settleRound, lottery.cancelRound]);

  const handleSubmit = async (guess: number, confidence: number): Promise<boolean> => {
    if (!wallet.provider || !wallet.address) {
      setEncryptionError('Wallet not connected');
      return false;
    }

    if (!fhevmReady) {
      setEncryptionError('Encryption library not ready');
      return false;
    }

    if (!CONTRACT_ADDRESS) {
      setEncryptionError('Contract address not configured');
      return false;
    }

    setEncryptionError(null);
    console.log('Encrypting prediction - guess:', guess, 'confidence:', confidence);

    try {
      // Encrypt the prediction using real FHE
      const encrypted = await encryptPrediction(
        wallet.provider,
        CONTRACT_ADDRESS,
        wallet.address,
        guess,
        confidence
      );

      console.log('Encryption successful, submitting to contract...');

      return lottery.submitEntry(
        encrypted.encryptedGuess,
        encrypted.encryptedConfidence,
        encrypted.inputProof
      );
    } catch (err: any) {
      console.error('Encryption failed:', err);
      setEncryptionError(err.message || 'Failed to encrypt prediction');
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Header
        address={wallet.address}
        isConnected={wallet.isConnected}
        isConnecting={wallet.isConnecting}
        isWrongNetwork={wallet.isWrongNetwork}
        onConnect={wallet.connect}
        onDisconnect={wallet.disconnect}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Prediction Under <span className="text-primary-400">Uncertainty</span>
          </h1>
          <p className="text-lg text-dark-400 max-w-2xl mx-auto">
            A privacy-first prediction game powered by Fully Homomorphic Encryption.
            All guesses remain encrypted until reveal. No one knows the outcome until it's revealed.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <div className="flex items-center gap-2 bg-dark-800 border border-dark-600 rounded-full px-4 py-2">
            <Shield className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-dark-300">FHE Encrypted</span>
          </div>
          <div className="flex items-center gap-2 bg-dark-800 border border-dark-600 rounded-full px-4 py-2">
            <Zap className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-dark-300">Fully Autonomous</span>
          </div>
          <div className="flex items-center gap-2 bg-dark-800 border border-dark-600 rounded-full px-4 py-2">
            <Eye className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-dark-300">Reveal at Settlement</span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Round Info & Entry */}
          <div className="lg:col-span-2 space-y-6">
            <RoundInfo
              round={lottery.currentRound}
              timeRemaining={lottery.timeRemaining}
              onSettleRound={lottery.settleRound}
              onCancelRound={lottery.cancelRound}
              isSettling={isAutoSettling || lottery.isLoading}
            />

            <EntryForm
              isConnected={wallet.isConnected}
              hasEntered={lottery.hasEntered}
              isLoading={lottery.isLoading}
              timeRemaining={lottery.timeRemaining}
              onSubmit={handleSubmit}
            />
          </div>

          {/* Right Column - Winner Categories */}
          <div className="space-y-6">
            <WinnerCategories />

            {/* How It Works */}
            <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-primary-400" />
                <h2 className="text-lg font-semibold text-white">How It Works</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">Submit Encrypted Prediction</p>
                    <p className="text-xs text-dark-400">Your guess and confidence are encrypted locally before submission</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">Scoring Under Encryption</p>
                    <p className="text-xs text-dark-400">All computations happen on encrypted data using FHE</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">Reveal & Settlement</p>
                    <p className="text-xs text-dark-400">All values are decrypted and winners are determined</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-xs font-bold shrink-0">
                    4
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">Automatic Next Round</p>
                    <p className="text-xs text-dark-400">New round starts immediately with fresh encrypted winning number</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {(wallet.error || lottery.error || encryptionError) && (
          <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">{wallet.error || lottery.error || encryptionError}</p>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <p className="text-xs text-dark-500">
            Deployed on Sepolia Testnet • Powered by Zama FHEVM • 1% Protocol Fee
          </p>
        </div>
      </main>
    </div>
  );
}
