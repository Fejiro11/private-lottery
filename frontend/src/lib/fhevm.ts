'use client';

import { BrowserProvider } from 'ethers';
import { initFhevm, createInstance, FhevmInstance } from 'fhevmjs';

let fhevmInstance: FhevmInstance | null = null;
let isInitialized = false;

// FHEVM Configuration for Sepolia
const FHEVM_CONFIG = {
  kmsContractAddress: '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A',
  aclContractAddress: '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
  gatewayUrl: 'https://gateway.testnet.zama.org',
};

/**
 * Initialize the FHEVM library
 * Must be called once before using encryption features
 */
export async function initializeFhevm(): Promise<void> {
  if (isInitialized) return;

  try {
    await initFhevm();
    isInitialized = true;
    console.log('FHEVM initialized successfully');
  } catch (error) {
    console.error('Failed to initialize FHEVM:', error);
    throw error;
  }
}

/**
 * Get or create an FHEVM instance for the current provider
 */
export async function getFhevmInstance(provider: BrowserProvider): Promise<FhevmInstance> {
  if (!isInitialized) {
    await initializeFhevm();
  }

  if (!fhevmInstance) {
    const network = await provider.getNetwork();
    fhevmInstance = await createInstance({
      chainId: Number(network.chainId),
      networkUrl: (provider as any).connection?.url || 'https://rpc.sepolia.org',
      ...FHEVM_CONFIG,
    });
    console.log('FHEVM instance created');
  }

  return fhevmInstance;
}

/**
 * Encrypt a guess and confidence for the lottery contract
 */
export async function encryptPrediction(
  provider: BrowserProvider,
  contractAddress: string,
  userAddress: string,
  guess: number,
  confidence: number
): Promise<{
  encryptedGuess: string;
  encryptedConfidence: string;
  inputProof: string;
}> {
  const instance = await getFhevmInstance(provider);

  // Create encrypted input bound to contract and user
  const input = instance.createEncryptedInput(contractAddress, userAddress);
  
  // Add both values to the encrypted input
  input.add32(guess);
  input.add32(confidence);
  
  // Encrypt and get handles + proof
  const encrypted = await input.encrypt();

  return {
    encryptedGuess: encrypted.handles[0],
    encryptedConfidence: encrypted.handles[1],
    inputProof: encrypted.inputProof,
  };
}

/**
 * Reset the FHEVM instance (useful on wallet/network change)
 */
export function resetFhevmInstance(): void {
  fhevmInstance = null;
}

export { type FhevmInstance };
