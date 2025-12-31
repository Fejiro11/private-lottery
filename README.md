# FHEVM Examples & Automation Tools

A comprehensive collection of FHEVM example contracts with automation scripts for generating, testing, and documenting Fully Homomorphic Encryption smart contracts.

## 🏆 Zama Bounty Submission

A privacy-first lottery dApp using **Fully Homomorphic Encryption (FHE)** where all guesses, confidence levels, and the winning number remain encrypted throughout each round and are only revealed at settlement.

## Overview

This protocol operates as a semi-autonomous prediction game. Once deployed, the system runs continuously with minimal human intervention. No admin or operator manually starts or ends rounds.

### Key Features

- **🔐 Full Privacy**: All guesses and the winning number are encrypted using Zama's FHEVM
- **⚡ Fully Autonomous**: Rounds run continuously without admin intervention
- **🎯 Three Winner Categories**: Rewards different forms of predictive skill
- **💰 Fair Distribution**: 1% platform fee, asymmetric payouts to winners
- **🔍 Transparent Reveal**: All values decrypted and verified at settlement

## How It Works

### Round Lifecycle

1. **Round Start**: A new round begins with an encrypted random winning number (0-1023)
2. **Entry Phase**: Participants submit encrypted guesses and confidence levels
3. **Settlement Trigger**: When round timer expires, anyone can trigger settlement
4. **Score Computation**: Scores computed in batches using FHE operations (encrypted comparisons)
5. **Winner Reveal**: Only winner indices and their data are decrypted and verified
6. **Prize Distribution**: Winners paid, new round starts automatically

### Winner Categories

Each round produces exactly three distinct winners:

| Category | Description | Prize Share |
|----------|-------------|-------------|
| **Conviction Weighted** | Best combination of closeness and confidence | 50% |
| **Raw Accuracy** | Closest guess, ignoring confidence | 30% |
| **Best Calibration** | Confidence most closely matched actual accuracy | 20% |

### Scoring Logic

All scoring happens under encryption using FHE operations:

- **Distance**: `|guess - winningNumber|` computed via `FHE.gte()` + `FHE.select()` + `FHE.sub()`
- **Raw Score**: `MAX_GUESS - distance` (higher is better)
- **Conviction Score**: `rawScore × confidence` computed via `FHE.mul()`
- **Calibration Error**: `|confidence - normalizedAccuracy|` computed under encryption

Winner selection uses encrypted comparisons:
- `FHE.gt()` to find highest conviction score
- `FHE.lt()` to find lowest distance (best accuracy)
- `FHE.lt()` to find lowest calibration error

## Technical Architecture

### Smart Contract

The `PrivLottery.sol` contract uses Zama's FHEVM for:

- Encrypted winning number generation (`FHE.randEuint16()` masked to 10 bits)
- Encrypted input validation (`FHE.fromExternal()`)
- Encrypted distance computation (`FHE.sub()` + `FHE.select()`)
- Encrypted score computation (`FHE.mul()`, `FHE.div()`)
- Encrypted winner selection (`FHE.lt()`, `FHE.gt()`, `FHE.select()`)
- Batch score processing for gas efficiency
- Public decryption for reveal (`FHE.makePubliclyDecryptable()`)
- Signature verification (`FHE.checkSignatures()`)

### Parameters

| Parameter | Value |
|-----------|-------|
| Entry Fee | 0.001 ETH |
| Round Duration | 1 hour |
| Max Participants | 100 |
| Min Participants | 3 |
| Guess Range | 0 - 1023 |
| Confidence Range | 0 - 100% |
| Platform Fee | 1% |

## Project Structure

```
fhevm-examples/
├── base-template/              # Clean Hardhat template to clone
│   ├── contracts/              # Empty - contracts added per example
│   ├── test/                   # Empty - tests added per example
│   ├── deploy/                 # Deployment scripts
│   ├── hardhat.config.ts       # Hardhat configuration
│   └── package.json            # Dependencies (@fhevm/solidity)
│
├── examples/                   # Example contracts by category
│   ├── basic/                  # FHECounter, FHEArithmetic
│   ├── encryption/             # EncryptSingleValue, EncryptMultiple
│   ├── decryption/             # PublicDecryptSingle, UserDecrypt
│   ├── access-control/         # AccessControl, Permissions
│   ├── advanced/               # BlindAuction, PrivLottery
│   └── anti-patterns/          # Common mistakes to avoid
│
├── scripts/                    # Automation tools
│   ├── create-fhevm-example.ts # Generate example projects
│   └── generate-docs.ts        # Auto-generate documentation
│
├── docs/                       # Generated GitBook documentation
│
├── contracts/                  # Main PrivLottery contract
│   └── PrivLottery.sol
│
├── frontend/                   # Demo frontend (Next.js)
│
├── DEVELOPER_GUIDE.md          # Guide for adding new examples
└── README.md
```

## Setup & Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask wallet with Sepolia ETH

### Install Dependencies

```bash
# Root directory (smart contracts)
npm install

# Frontend
cd frontend
npm install
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-api-key
PRIVATE_KEY=0x_your_private_key_here
TREASURY_ADDRESS=0x_treasury_address
```

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_deployed_contract_address
```

## Development

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm run test
```

### Start Local Node

```bash
npm run node
```

### Deploy Locally

```bash
npm run deploy:local
```

### Deploy to Sepolia

```bash
npm run deploy:sepolia
```

### Run Frontend

```bash
cd frontend
npm run dev
```

## Testnet Deployment

This project is configured for **Sepolia Ethereum Testnet**.

### Sepolia Faucets

- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)

### Contract Addresses (Zama FHEVM on Sepolia)

| Contract | Address |
|----------|---------|
| FHEVM Executor | `0x92C920834Ec8941d2C77D188936E1f7A6f49c127` |
| ACL Contract | `0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D` |
| KMS Verifier | `0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A` |
| Input Verifier | `0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0` |

## User Flow

### Submitting a Prediction

1. Connect your MetaMask wallet
2. Ensure you're on Sepolia network
3. Select your guess (0-1023)
4. Set your confidence level (0-100%)
5. Submit with 0.001 ETH entry fee
6. Your guess is encrypted locally before submission

### After Submission

- Your entry appears as encrypted data on-chain
- No one can see your guess or confidence
- Wait for round to end or reach max participants

### Reveal Phase

- All encrypted values are decrypted
- Winning number is revealed
- Scores are calculated and verified
- Three winners are determined and paid

## Design Philosophy

### Privacy First

All sensitive data is encrypted using FHE. During gameplay:
- Winning number: **Encrypted**
- Player guesses: **Encrypted**
- Confidence levels: **Encrypted**
- Score calculations: **Encrypted**

### Prediction Under Uncertainty

This is not gambling—it's a prediction game that rewards:
- **Accuracy**: How close your guess is to the target
- **Conviction**: Confidence in your prediction
- **Calibration**: Honest self-assessment of uncertainty

### Fully Autonomous

- No admin can start/stop rounds
- No manual intervention required
- Protocol runs indefinitely once deployed
- All flows are rule-based and deterministic

## Security Considerations

- Uses Zama's audited FHEVM infrastructure
- All encrypted operations verified on-chain
- Decryption proofs validated by KMS
- No single point of failure for randomness

## License

BSD-3-Clause-Clear

## Acknowledgments

- [Zama](https://www.zama.ai/) for FHEVM technology
- Built for the FHE ecosystem

---

**⚠️ Testnet Only**: This is a demonstration project for educational purposes. Use throwaway wallets and testnet ETH only.
