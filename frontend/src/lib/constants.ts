import CONTRACT_ABI_JSON from './abi.json';

export const SEPOLIA_CHAIN_ID = 11155111;

// Deployed contract address on Sepolia
export const CONTRACT_ADDRESS = '0x4C80cf40A814C8D58fFF874E62A51fd2e677Ee4E';

export const ENTRY_FEE = '0.001';

export const MAX_GUESS = 1000;
export const MAX_CONFIDENCE = 100;

export const WINNER_CATEGORIES = {
  CONVICTION_WEIGHTED: {
    name: 'Conviction Weighted',
    description: 'Strongest combination of closeness and confidence',
    share: '50%',
  },
  RAW_ACCURACY: {
    name: 'Raw Accuracy',
    description: 'Closest guess, regardless of confidence',
    share: '30%',
  },
  CALIBRATION: {
    name: 'Best Calibration',
    description: 'Confidence most closely matched actual accuracy',
    share: '20%',
  },
};

export const CONTRACT_ABI = CONTRACT_ABI_JSON;
