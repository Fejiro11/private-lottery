'use client';

import { BrowserProvider } from 'ethers';

// Dynamic import to handle SSR
let fhevmModule: typeof import('@zama-fhe/relayer-sdk') | null = null;
let fhevmInstance: any = null;
let isInitialized = false;

/**
 * Convert Uint8Array to hex string
 */
function toHexString(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Initialize the FHEVM SDK
 * Must be called once before using encryption features
 */
export async function initializeFhevm(): Promise<void> {
  if (isInitialized) return;
  if (typeof window === 'undefined') return; // Skip on SSR

  try {
    // Dynamic import to avoid SSR issues
    fhevmModule = await import('@zama-fhe/relayer-sdk');
    isInitialized = true;
    console.log('FHEVM SDK loaded successfully');
  } catch (error) {
    console.error('Failed to load FHEVM SDK:', error);
    throw error;
  }
}

/**
 * Get or create an FHEVM instance for the current provider
 */
export async function getFhevmInstance(provider: BrowserProvider): Promise<any> {
  if (!isInitialized || !fhevmModule) {
    await initializeFhevm();
  }

  if (!fhevmModule) {
    throw new Error('FHEVM SDK not loaded');
  }

  if (!fhevmInstance) {
    const network = await provider.getNetwork();
    
    // Use Sepolia configuration
    const config = {
      chainId: Number(network.chainId),
      networkUrl: 'https://rpc.sepolia.org',
      kmsContractAddress: '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A' as `0x${string}`,
      aclContractAddress: '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D' as `0x${string}`,
      gatewayUrl: 'https://gateway.testnet.zama.org',
    };
    
    fhevmInstance = await fhevmModule.createInstance(config);
    console.log('FHEVM instance created');
  }

  return fhevmInstance;
}

interface EncryptedPrediction {
  encryptedGuess: string;
  encryptedConfidence: string;
  inputProof: string;
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
): Promise<EncryptedPrediction> {
  const instance = await getFhevmInstance(provider);

  // Create encrypted input bound to contract and user
  const input = instance.createEncryptedInput(
    contractAddress as `0x${string}`,
    userAddress as `0x${string}`
  );
  
  // Add both values to the encrypted input (32-bit integers)
  input.add32(guess);
  input.add32(confidence);
  
  // Encrypt and get handles + proof
  const encrypted = await input.encrypt();

  // Convert Uint8Array handles to hex strings for contract calls
  return {
    encryptedGuess: toHexString(encrypted.handles[0]),
    encryptedConfidence: toHexString(encrypted.handles[1]),
    inputProof: toHexString(encrypted.inputProof),
  };
}

/**
 * Reset the FHEVM instance (useful on wallet/network change)
 */
export function resetFhevmInstance(): void {
  fhevmInstance = null;
}
