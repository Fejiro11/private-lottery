# PrivLottery

> A privacy-first lottery using Fully Homomorphic Encryption

**Chapter:** ``

**Source:** `PrivLottery.sol`

## Overview

This contract demonstrates key FHEVM concepts for the "" category.

## Functions

### `submitPrediction()`

A privacy-first lottery using Fully Homomorphic Encryption

> All guesses and confidence values remain encrypted until settlement

**Parameters:**

- `encryptedGuess`: The encrypted guess (1-1000)
- `encryptedConfidence`: The encrypted confidence level (1-100)
- `inputProof`: Zero-knowledge proof for the encrypted inputs

### `settleRound()`

Trigger settlement when round timer expires

### `finalizeRound()`

Finalize the round with revealed winning number

**Parameters:**

- `winningNumber`: The revealed winning number
- `decryptionProof`: Proof from Zama KMS

### `processWinners()`

Process all participants and determine winners

**Parameters:**

- `participantReveals`: Array of (guess, confidence) pairs
- `batchProof`: Combined decryption proof

## Events

- `RoundStarted`
- `ParticipantJoined`
- `RoundSettling`
- `RoundRevealed`
- `WinnerDeclared`
- `RoundCompleted`

## Key Concepts

- See contract documentation

## Related Documentation

- [Zama FHEVM Documentation](https://docs.zama.org/protocol)
- [FHEVM Solidity Library](https://github.com/zama-ai/fhevm-solidity)
